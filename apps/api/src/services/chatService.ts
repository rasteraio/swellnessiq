/**
 * ChatService — Patient Q&A assistant powered by Claude
 *
 * Provides non-diagnostic health guidance, medication reminders,
 * and education support within a safe, guardrailed context.
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/database';
import { logger } from '../lib/logger';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const CHAT_SYSTEM_PROMPT = `You are RasteraAssist, a compassionate health education assistant for recently discharged patients.

YOUR ROLE:
- Help patients understand their discharge instructions and medications
- Explain medical terms in simple, plain language
- Remind patients about their care plan and self-monitoring goals
- Provide emotional support and encouragement during recovery
- Guide patients to appropriate resources

STRICT BOUNDARIES — NEVER:
- Diagnose symptoms or conditions
- Recommend changing prescribed medications or doses
- Interpret lab results or test results
- Replace advice from the patient's care team
- Make promises about health outcomes

WHEN PATIENTS DESCRIBE CONCERNING SYMPTOMS (chest pain, severe shortness of breath, sudden weakness, etc.):
ALWAYS respond with: "This sounds like it could be urgent. Please call 911 or go to your nearest emergency room immediately. Do not wait."

TONE: Warm, patient, encouraging. Use simple language (6th-grade level). Be concise — patients may be elderly or anxious.

CRITICAL: Always end responses that involve health concerns with "If you're unsure or things worsen, please contact your care team or call 911."`;

export class ChatService {

  static async sendMessage(
    sessionId: string,
    patientId: string,
    userMessage: string
  ): Promise<string> {

    // Load session with recent history (last 20 messages for context)
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        patient: {
          include: {
            user: { select: { firstName: true } },
            comorbidities: true,
            medications: { where: { isActive: true }, take: 10 },
            progress: {
              where: { status: 'COMPLETED' },
              include: { module: { select: { title: true } } },
              take: 5,
            },
          },
        },
      },
    });

    if (!session) throw new Error('Chat session not found');

    const patient = session.patient;
    const daysPostDischarge = Math.floor(
      (Date.now() - patient.dischargeDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Build context injection for personalization
    const patientContext = `
Patient Context (for your reference only, do not repeat to patient):
- Name: ${patient.user?.firstName}
- Primary condition: ${patient.primaryCondition}
- Comorbidities: ${patient.comorbidities.map(c => c.condition).join(', ') || 'None'}
- Active medications: ${patient.medications.map(m => m.name).join(', ') || 'None listed'}
- Days post-discharge: ${daysPostDischarge}
- Recently completed modules: ${patient.progress.map(p => p.module.title).join(', ') || 'None yet'}
`;

    // Build conversation history (reverse to chronological order)
    const history = session.messages.reverse().map(m => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content,
    }));

    // Save user message
    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'USER',
        content: userMessage,
      },
    });

    try {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 512,
        system: [
          {
            type: 'text',
            text: CHAT_SYSTEM_PROMPT + '\n\n' + patientContext,
            cache_control: { type: 'ephemeral' }, // Cache system prompt per session
          },
        ],
        messages: [
          ...history,
          { role: 'user', content: userMessage },
        ],
      });

      const assistantMessage = response.content[0].type === 'text'
        ? response.content[0].text
        : "I'm sorry, I couldn't process that. Please contact your care team directly.";

      // Save assistant response + token count
      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'ASSISTANT',
          content: assistantMessage,
          tokens: response.usage.output_tokens,
        },
      });

      // Update session timestamp
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      // Flag potential urgent messages for care team review
      const urgentKeywords = ['chest pain', 'can\'t breathe', 'shortness of breath', 'fell', 'dizzy', 'confused', 'swelling'];
      const isUrgent = urgentKeywords.some(kw => userMessage.toLowerCase().includes(kw));

      if (isUrgent) {
        await prisma.alert.create({
          data: {
            patientId,
            severity: 'HIGH',
            type: 'SYMPTOM',
            message: `Patient reported potential urgent symptom via chat: "${userMessage.substring(0, 200)}"`,
          },
        });
        logger.warn('Urgent symptom detected in chat', { patientId, sessionId });
      }

      return assistantMessage;

    } catch (err) {
      logger.error('Chat AI error', { sessionId, patientId, error: err });
      return "I'm having trouble connecting right now. For urgent health concerns, please call your care team or 911. Try again in a moment.";
    }
  }

  static async createSession(patientId: string): Promise<string> {
    const session = await prisma.chatSession.create({
      data: {
        patientId,
        messages: {
          create: [{
            role: 'ASSISTANT',
            content: `Hello! I'm RasteraAssist, your health education companion. I'm here to help you understand your care plan, explain medical terms, and answer questions about your recovery. What's on your mind today?`,
          }],
        },
      },
    });
    return session.id;
  }
}
