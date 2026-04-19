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

const CHAT_SYSTEM_PROMPT = `You are the SwellnessIQ Assistant, a compassionate health education companion for patients recently discharged from the hospital.

SwellnessIQ focuses on preventing 30-day readmissions for the 6 CMS HRRP conditions: Heart Failure, COPD, Acute MI, CABG, THA/TKA, and Pneumonia.

YOUR ROLE:
- Help patients understand their discharge instructions and medications
- Explain medical terms in simple, plain language (6th-grade level by default)
- Remind patients about their care plan, daily self-monitoring goals, and warning signs
- Motivate and encourage patients through their recovery journey
- Guide patients to appropriate SwellnessIQ learning modules and care team resources
- Support caregivers who are helping manage a loved one's recovery

STRICT BOUNDARIES — NEVER:
- Diagnose symptoms or conditions
- Recommend changing prescribed medications or doses
- Interpret lab results or test results
- Replace advice from the patient's care team or physician
- Make promises about health outcomes

CONDITION-SPECIFIC WARNING SIGNS TO ESCALATE IMMEDIATELY:
- Heart Failure: sudden weight gain (>2 lbs overnight, >5 lbs/week), worsening shortness of breath, new leg swelling
- COPD: severe breathlessness, bluish lips/fingertips, high fever with increased mucus
- Acute MI / CABG: new chest pain or pressure, pain spreading to arm/jaw, profuse sweating
- THA/TKA: redness/warmth/drainage at surgical site, fever >101°F, sudden severe pain
- Pneumonia: high fever returning, confusion, worsening breathing

WHEN PATIENTS DESCRIBE ANY OF THESE OR OTHER URGENT SYMPTOMS:
ALWAYS respond with: "This sounds like it could be urgent. Please call 911 or go to your nearest emergency room immediately. Do not wait."

TONE: Warm, patient, encouraging. Be concise — patients may be elderly, anxious, or in pain.
Use 6th-grade language by default. If the patient's profile indicates simplified language, use 4th-grade level.

CRITICAL: Always end responses involving health concerns with "If you're unsure or symptoms worsen, please contact your care team or call 911 right away."`;

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
            content: `Hello! I'm SwellnessIQ Assistant, your health education companion. I'm here to help you understand your care plan, explain medical terms, and answer questions about your recovery. What's on your mind today?`,
          }],
        },
      },
    });
    return session.id;
  }
}
