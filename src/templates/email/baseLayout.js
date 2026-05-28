import env from '../../config/env.js';
import { escapeHtml } from './escapeHtml.js';

const BRAND = 'TeachersPoints';
const PRIMARY = '#4f46e5';
const PRIMARY_DARK = '#4338ca';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f1f5f9';

/**
 * Wrap email body HTML in a responsive, client-safe table layout.
 * @param {{ preheader?: string, title: string, bodyHtml: string }} opts
 */
export function wrapEmail({ preheader = '', title, bodyHtml }) {
  const clientUrl = env.clientUrl.replace(/\/$/, '');
  const year = new Date().getFullYear();
  const safeTitle = escapeHtml(title);
  const safePreheader = escapeHtml(preheader);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${safeTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
    table { border-collapse: collapse; }
    a { color: ${PRIMARY}; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .px { padding-left: 20px !important; padding-right: 20px !important; }
      .btn { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${safePreheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${PRIMARY} 0%,#7c3aed 100%);border-radius:16px 16px 0 0;padding:28px 32px;" class="px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">${BRAND}</p>
                    <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.9);">${safeTitle}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};padding:32px;" class="px">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#ffffff;border:1px solid ${BORDER};border-top:none;border-radius:0 0 16px 16px;padding:24px 32px;" class="px">
              <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:${MUTED};text-align:center;">
                You received this email because you created an account at
                <a href="${clientUrl}" style="color:${PRIMARY};text-decoration:none;font-weight:600;">${BRAND}</a>.
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                &copy; ${year} ${BRAND}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Primary CTA button (bulletproof for Outlook).
 */
export function emailButton(href, label) {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
  <tr>
    <td align="center">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeHref}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="17%" strokecolor="${PRIMARY_DARK}" fillcolor="${PRIMARY}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">${safeLabel}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${safeHref}" class="btn" style="display:inline-block;background-color:${PRIMARY};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;box-shadow:0 4px 14px rgba(79,70,229,0.35);">${safeLabel}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

export function featureList(items) {
  const rows = items
    .map(
      (item) => `
    <tr>
      <td valign="top" width="28" style="padding:6px 0;color:${PRIMARY};font-size:18px;line-height:1;">&#10003;</td>
      <td style="padding:6px 0 6px 4px;font-size:15px;line-height:1.5;color:#334155;">${item}</td>
    </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">${rows}</table>`;
}
