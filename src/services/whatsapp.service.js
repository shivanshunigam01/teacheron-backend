import axios from 'axios';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';

function parseJsonEnv(raw, fallback) {
  if (!raw?.trim()) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    logger.warn('[whatsapp] Invalid JSON in env, using fallback');
    return fallback;
  }
}

function buildPayload(phone, otp) {
  const { aisensy } = env;
  const otpParamKey = aisensy.otpParamKey || 'FirstName';
  const templateParams = parseJsonEnv(aisensy.templateParamsJson, null);
  const paramsFallbackValue = {
    ...parseJsonEnv(aisensy.paramsFallbackJson, {}),
    [otpParamKey]: otp,
    OTP: otp,
  };

  const payload = {
    apiKey: aisensy.apiKey,
    campaignName: aisensy.campaignName,
    destination: phone,
    userName: aisensy.userName,
    templateParams: templateParams ?? [otp],
    source: aisensy.source,
    media: {},
    carouselCards: [],
    location: {},
    attributes: {},
    paramsFallbackValue,
  };

  // Authentication OTP templates often use a copy-code button; URL buttons are configurable via env.
  const buttons = parseJsonEnv(aisensy.buttonsJson, null);
  if (buttons) {
    payload.buttons = buttons.map((btn) => {
      if (btn?.parameters?.length) {
        return {
          ...btn,
          parameters: btn.parameters.map((p) =>
            p?.type === 'text' ? { ...p, text: otp } : p,
          ),
        };
      }
      return btn;
    });
  } else if (aisensy.useCopyCodeButton) {
    payload.buttons = [
      {
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [{ type: 'text', text: otp }],
      },
    ];
  }

  return payload;
}

/**
 * Send OTP via AiSensy campaign API.
 * @param {string} phone — E.164 without plus (e.g. 919876543210)
 * @param {string} otp — 6-digit code (never logged in production)
 * @param {{ firstName?: string }} [options]
 */
export async function sendOTP(phone, otp) {
  const { aisensy } = env;

  if (!aisensy.apiKey || !aisensy.apiEndpoint || !aisensy.campaignName) {
    throw ApiError.internal(
      'WhatsApp OTP is not configured. Set AISENSY_API_KEY, AISENSY_API_ENDPOINT, and AISENSY_CAMPAIGN_NAME.',
    );
  }

  const payload = buildPayload(phone, otp);

  try {
    const { data, status } = await axios.post(aisensy.apiEndpoint, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    });

    if (status < 200 || status >= 300) {
      logger.error('[whatsapp] AiSensy non-2xx', { status, data });
      throw ApiError.badGateway('Could not send WhatsApp OTP. Try again later.');
    }

    if (data?.success === false) {
      logger.error('[whatsapp] AiSensy rejected request', { data });
      throw ApiError.badGateway(data?.message || 'WhatsApp OTP delivery failed');
    }

    logger.info('[whatsapp] OTP sent', { phone: `${phone.slice(0, 4)}****${phone.slice(-2)}` });
    return { sent: true, providerResponse: data };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const message = err.response?.data?.message || err.message || 'WhatsApp API error';
    logger.error(`[whatsapp] AiSensy request failed: ${message}`);
    throw ApiError.badGateway('Could not send WhatsApp OTP. Try again later.');
  }
}

export function isWhatsAppConfigured() {
  const { aisensy } = env;
  return Boolean(aisensy.apiKey && aisensy.apiEndpoint && aisensy.campaignName);
}
