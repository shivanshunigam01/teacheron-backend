import { escapeHtml } from './escapeHtml.js';
import { getBrandLogoUrl, getEmailClientUrl } from './brand.js';

const BRAND = 'TeachersPoints';
const PRIMARY = '#6366f1';
const PRIMARY_DARK = '#4f46e5';
const ACCENT = '#7c3aed';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#eef2ff';
const CARD_BG = '#ffffff';

/**
 * Wrap email body HTML in a responsive, client-safe table layout.
 * @param {{ preheader?: string, title: string; bodyHtml: string }} opts
 */
export function wrapEmail({ preheader = '', title, bodyHtml }) {
  const clientUrl = getEmailClientUrl();
  const logoUrl = getBrandLogoUrl();
  const year = new Date().getFullYear();
  const safeTitle = escapeHtml(title);
  const safePreheader = escapeHtml(preheader);
  const safeLogoUrl = escapeHtml(logoUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${safeTitle}</title>
  <style>
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
    table { border-collapse: collapse; }
    a { color: ${PRIMARY}; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .px { padding-left: 16px !important; padding-right: 16px !important; }
      .btn { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
      .course-img { width: 100% !important; display: block !important; margin-bottom: 12px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:linear-gradient(180deg,${BG} 0%,#f8fafc 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${safePreheader}&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:36px 16px 24px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Logo bar -->
          <tr>
            <td align="center" style="padding:0 0 20px;">
              <a href="${clientUrl}" style="text-decoration:none;">
                <img src="${safeLogoUrl}" alt="${BRAND}" width="200" style="display:block;max-width:200px;height:auto;border:0;" />
              </a>
            </td>
          </tr>
          <!-- Hero header -->
          <tr>
            <td style="background:linear-gradient(135deg,${PRIMARY} 0%,${ACCENT} 100%);border-radius:20px 20px 0 0;padding:32px 36px;box-shadow:0 10px 40px rgba(99,102,241,0.25);" class="px">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.85);">${BRAND}</p>
              <p style="margin:0;font-size:20px;font-weight:700;line-height:1.35;color:#ffffff;">${safeTitle}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:${CARD_BG};border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};padding:36px 32px;box-shadow:0 4px 24px rgba(15,23,42,0.04);" class="px">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border:1px solid ${BORDER};border-top:none;border-radius:0 0 20px 20px;padding:28px 32px;" class="px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <img src="${safeLogoUrl}" alt="${BRAND}" width="120" style="display:block;max-width:120px;height:auto;opacity:0.9;border:0;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:${MUTED};">
                      You received this because you signed up at
                      <a href="${clientUrl}" style="color:${PRIMARY};font-weight:600;text-decoration:none;">${BRAND}</a>.
                    </p>
                    <p style="margin:0 0 14px;font-size:13px;">
                      <a href="${clientUrl}/courses" style="color:${PRIMARY};font-weight:600;text-decoration:none;margin:0 8px;">Courses</a>
                      &middot;
                      <a href="${clientUrl}/login" style="color:${PRIMARY};font-weight:600;text-decoration:none;margin:0 8px;">Login</a>
                      &middot;
                      <a href="${clientUrl}/profile" style="color:${PRIMARY};font-weight:600;text-decoration:none;margin:0 8px;">Profile</a>
                    </p>
                    <p style="margin:0;font-size:11px;color:#94a3b8;">&copy; ${year} ${BRAND}. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Primary CTA — solid bgcolor for Gmail/Outlook (gradients often hide button text). */
export function emailButton(href, label) {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  const bg = PRIMARY;
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:24px 0 8px;">
  <tr>
    <td align="center">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safeHref}" style="height:48px;v-text-anchor:middle;width:300px;" arcsize="20%" stroke="f" fillcolor="${bg}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${safeLabel}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center" bgcolor="${bg}" style="border-radius:12px;background-color:${bg};">
            <a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="btn" style="display:inline-block;padding:15px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.25;color:#ffffff !important;text-decoration:none;border-radius:12px;background-color:${bg};border:1px solid ${PRIMARY_DARK};">
              <span style="color:#ffffff !important;mso-line-height-rule:exactly;">${safeLabel}</span>
            </a>
          </td>
        </tr>
      </table>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

/** Outlined secondary CTA — dark text on white for readability everywhere. */
export function emailButtonOutline(href, label) {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 0;">
  <tr>
    <td align="left" bgcolor="#ffffff" style="border:2px solid ${PRIMARY};border-radius:10px;background-color:#ffffff;">
      <a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;font-weight:700;line-height:1.25;color:${PRIMARY} !important;text-decoration:none;background-color:#ffffff;">
        <span style="color:${PRIMARY} !important;">${safeLabel}</span>
      </a>
    </td>
  </tr>
</table>`;
}

export function featureList(items) {
  const rows = items
    .map(
      (item) => `
    <tr>
      <td valign="top" width="32" style="padding:8px 0;">
        <div style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,${PRIMARY},${ACCENT});color:#fff;font-size:12px;line-height:22px;text-align:center;">&#10003;</div>
      </td>
      <td style="padding:8px 0 8px 6px;font-size:15px;line-height:1.55;color:#334155;">${item}</td>
    </tr>`,
    )
    .join('');
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f8fafc;border-radius:14px;border:1px solid ${BORDER};">
  <tr><td style="padding:18px 20px;">${rows}</td></tr>
</table>`;
}

export function sectionHeading(text) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 16px;">
  <tr>
    <td style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${PRIMARY};">${escapeHtml(text)}</td>
  </tr>
  <tr>
    <td style="padding-top:8px;height:3px;background:linear-gradient(90deg,${PRIMARY},${ACCENT});border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
  </tr>
</table>`;
}
