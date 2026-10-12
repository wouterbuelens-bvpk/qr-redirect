/************************************************************
 * HBO GENK - DYNAMISCHE QR-CODE GENERATOR
 * Code.gs  (Google Apps Script backend)
 *
 * Script Properties die je moet instellen:
 *   - SHEET_ID           (verplicht)
 *   - DRIVE_FOLDER_ID    (verplicht)
 *   - SHEET_NAME         (optioneel, standaard "Links")
 *   - EMAIL_AFZENDER     (optioneel)
 *   - GENERATOR_KEY      (verplicht als je generator wil afschermen)
 *   - ALLOWED_EMAILS     (optioneel, komma-gescheiden lijst)
 *   - REDIRECT_BASE      (verplicht, bv. https://wouterbuelens-bvpk.github.io/qr-redirect/)
 ************************************************************/

// ============================================================
// CONFIGURATIE
// ============================================================
function getConfig_() {
  const props = PropertiesService.getScriptProperties();

  return {
    SHEET_ID:        props.getProperty("SHEET_ID")        || "",
    DRIVE_FOLDER_ID: props.getProperty("DRIVE_FOLDER_ID") || "",
    SHEET_NAME:      props.getProperty("SHEET_NAME")      || "Links",
    EMAIL_AFZENDER:  props.getProperty("EMAIL_AFZENDER")  || "",
    GENERATOR_KEY:   props.getProperty("GENERATOR_KEY")   || "",
    REDIRECT_BASE:   props.getProperty("REDIRECT_BASE")   || "",
    ALLOWED_EMAILS:  (props.getProperty("ALLOWED_EMAILS") || "")
                        .split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
  };
}

// ============================================================
// EENMALIGE SETUP  --  pas waarden aan en voer 1x uit
// ============================================================
function setupScriptProperties() {
  const props = PropertiesService.getScriptProperties();

  props.setProperties({
    SHEET_ID:        "1_-I4fK7x9hYNNXhLkWNyLskEiqlPkwEHAb_6NjcHacY",
    DRIVE_FOLDER_ID: "1qtTOmMvBBKmkhILJwA9HKKrsqJ0XL8gX",
    SHEET_NAME:      "Links",
    EMAIL_AFZENDER:  "",

    GENERATOR_KEY:   "hbogenkqr2026",
    ALLOWED_EMAILS:  "jouw.naam@hbogenk.be,collega@hbogenk.be",

    // GitHub Pages basis-URL (eindigt op een slash!)
    REDIRECT_BASE:   "https://wouterbuelens-bvpk.github.io/qr-redirect/"
  });

  Logger.log("Script Properties ingesteld.");
}

// ============================================================
// doGet  --  hoofdrouter
// ============================================================
function doGet(e) {
  e = e || { parameter: {} };
  const cfg = getConfig_();

  // Route 0: JSONP-API voor GitHub Pages
  if (e.parameter && e.parameter.id && e.parameter.format === "jsonp") {
    return handleJsonp_(cfg, e.parameter.id, e.parameter.callback);
  }

  // Route 1: publieke dynamische redirect (iframe-variant, als fallback)
  if (e.parameter && e.parameter.id) {
    return handleRedirect_(cfg, e.parameter.id);
  }

  // Route 2: beveiligde generator
  const authed = isAuthorized_(e, cfg);
  if (authed.ok) {
    return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle('HBO Genk - QR Generator')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // Route 3: toegangspoort
  return HtmlService.createHtmlOutput(buildGatePage_(e, authed.error))
    .setTitle('Toegang vereist')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ============================================================
// handleRedirect_  --  publieke doorverwijzing via iframe
// (blijft bestaan als fallback, bv. voor oude QR-codes die
//  nog naar /exec?id=... wijzen)
// ============================================================
function handleRedirect_(cfg, id) {
  const sheet = SpreadsheetApp.openById(cfg.SHEET_ID).getSheetByName(cfg.SHEET_NAME);
  const data  = sheet.getDataRange().getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {

      let targetUrl = String(data[i][1]).trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      const htmlSafeUrl = targetUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

      return HtmlService.createHtmlOutput(
        `<!DOCTYPE html>
        <html>
          <head>
            <base target="_top">
            <meta charset="utf-8">
            <meta http-equiv="refresh" content="1; url=${htmlSafeUrl}">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Doorverwijzen...</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; text-align: center; padding: 30px 15px; background: #f4f7f6; color: #706f6f; margin: 0; }
              .card { background: white; padding: 30px 20px; border-radius: 8px; max-width: 380px; margin: 20px auto; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-top: 6px solid #008cd3; }
              .logo { max-width: 180px; margin-bottom: 15px; }
              .btn { display: inline-block; background-color: #95c11f; color: white; padding: 14px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; margin-top: 15px; font-size: 15px; }
              .btn:hover { background-color: #7da518; }
              .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #008cd3; border-radius: 50%; width: 26px; height: 26px; animation: spin 0.8s linear infinite; margin: 15px auto; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="card">
              <img src="https://lh3.googleusercontent.com/d/1F-Z9qZPejAZiJK-KLCRfvnmLbyu-zZfE" alt="HBO Genk Logo" class="logo">
              <div class="spinner"></div>
              <p style="margin: 5px 0 10px 0; font-size: 14px;">Je wordt doorgestuurd...</p>
              <a id="redirectBtn" href="${htmlSafeUrl}" class="btn" target="_top">Klik hier om direct door te gaan</a>
            </div>
          </body>
        </html>`
      );
    }
  }

  return HtmlService.createHtmlOutput(
    "<p style='font-family:Arial;text-align:center;padding:40px;'>Link niet gevonden of niet meer actief.</p>"
  );
}

// ============================================================
// handleJsonp_  --  JSONP-API voor GitHub Pages
// Roept:  ?id=XXXX&format=jsonp&callback=myCallback
// Geeft:  myCallback({"url":"https://doel.be"});
// ============================================================
function handleJsonp_(cfg, id, callback) {
  const safeCallback = String(callback || "callback").replace(/[^a-zA-Z0-9_.]/g, "");

  try {
    const sheet = SpreadsheetApp.openById(cfg.SHEET_ID).getSheetByName(cfg.SHEET_NAME);
    const data  = sheet.getDataRange().getValues();

    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        let targetUrl = String(data[i][1]).trim();
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          targetUrl = 'https://' + targetUrl;
        }
        return ContentService
          .createTextOutput(safeCallback + "(" + JSON.stringify({ url: targetUrl }) + ");")
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
    }

    return ContentService
      .createTextOutput(safeCallback + "(" + JSON.stringify({ error: "not_found" }) + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);

  } catch (err) {
    return ContentService
      .createTextOutput(safeCallback + "(" + JSON.stringify({ error: err.message }) + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

// ============================================================
// isAuthorized_  --  checkt of de bezoeker de generator mag zien
// ============================================================
function isAuthorized_(e, cfg) {
  const providedKey = (e.parameter && e.parameter.key) ? String(e.parameter.key) : "";

  if (cfg.GENERATOR_KEY && providedKey) {
    if (providedKey === cfg.GENERATOR_KEY) return { ok: true };
    return { ok: false, error: "Ongeldige toegangscode." };
  }

  if (cfg.ALLOWED_EMAILS.length > 0) {
    const email = (Session.getActiveUser().getEmail() || "").toLowerCase();
    if (email && cfg.ALLOWED_EMAILS.indexOf(email) !== -1) return { ok: true };
  }

  return { ok: false, error: "" };
}

// ============================================================
// buildGatePage_  --  toegangspoort scherm
// ============================================================
function buildGatePage_(e, errorMsg) {
  const execUrl = ScriptApp.getService().getUrl();
  const fout    = errorMsg
    ? `<div class="fout">${errorMsg.replace(/</g,'&lt;')}</div>`
    : "";

  return `<!DOCTYPE html>
  <html>
    <head>
      <base target="_top">
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7f6; color: #706f6f; margin: 0; padding: 40px 15px; display: flex; justify-content: center; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 420px; width: 100%; border-top: 6px solid #008cd3; text-align: center; }
        .logo { max-width: 200px; margin: 0 auto 20px auto; display: block; }
        h2 { color: #008cd3; margin: 0 0 10px 0; }
        p { font-size: 14px; margin: 0 0 20px 0; }
        input[type=password] { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 15px; margin-bottom: 12px; }
        button { background: #95c11f; color: white; border: none; padding: 12px; width: 100%; font-size: 16px; font-weight: bold; border-radius: 4px; cursor: pointer; }
        button:hover { background: #7da518; }
        .fout { background: #fdecea; color: #b3261e; padding: 10px; border-radius: 4px; font-size: 13px; margin-bottom: 15px; border-left: 4px solid #b3261e; text-align: left; }
      </style>
    </head>
    <body>
      <div class="container">
        <img src="https://lh3.googleusercontent.com/d/1F-Z9qZPejAZiJK-KLCRfvnmLbyu-zZfE" alt="HBO Genk Logo" class="logo">
        <h2>Beveiligde zone</h2>
        <p>Deze QR-generator is enkel toegankelijk voor medewerkers van HBO Genk.<br>Geef de toegangscode in om verder te gaan.</p>
        ${fout}
        <form method="get" action="${execUrl}">
          <input type="password" name="key" placeholder="Toegangscode" autofocus required>
          <button type="submit">Toegang</button>
        </form>
      </div>
    </body>
  </html>`;
}

// ============================================================
// HULPFUNCTIES voor de client
// ============================================================
function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

// Geeft de GitHub Pages basis-URL door aan Index.html
function getRedirectBase() {
  const cfg = getConfig_();
  if (!cfg.REDIRECT_BASE) {
    throw new Error("REDIRECT_BASE is niet ingesteld in Script Properties.");
  }
  return cfg.REDIRECT_BASE;
}

function toonWebAppUrl() {
  Logger.log(ScriptApp.getService().getUrl());
}

function toonHuidigeProperties() {
  const props = PropertiesService.getScriptProperties().getProperties();
  Logger.log(JSON.stringify(props, null, 2));
}

// ============================================================
// processQrCode  --  verwerkt de aanvraag van het formulier
// ============================================================
function processQrCode(tempId, url, omschrijving, base64Image, sendEmail) {
  try {
    const cfg = getConfig_();

    if (!cfg.SHEET_ID) {
      throw new Error("SHEET_ID is niet ingesteld in Script Properties.");
    }

    // ---- 1. Opslaan in de sheet ----------------------------------
    const ss  = SpreadsheetApp.openById(cfg.SHEET_ID);
    let sheet = ss.getSheetByName(cfg.SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(cfg.SHEET_NAME);
      sheet.appendRow(["ID", "Doel-URL", "Omschrijving", "Aangemaakt op"]);
    }

    const existing = sheet.getDataRange().getValues();
    for (let i = 1; i < existing.length; i++) {
      if (String(existing[i][0]) === String(tempId)) {
        tempId = tempId + Math.random().toString(36).substr(2, 3);
        break;
      }
    }

    sheet.appendRow([tempId, url, omschrijving, new Date()]);

    // ---- 2. QR-afbeelding opslaan in Drive ----------------------
    const base64Data = base64Image.split(",")[1];
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      "image/png",
      omschrijving.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".png"
    );

    let file;
    if (cfg.DRIVE_FOLDER_ID) {
      file = DriveApp.getFolderById(cfg.DRIVE_FOLDER_ID).createFile(blob);
    } else {
      file = DriveApp.createFile(blob);
    }

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) { /* domeinpolicy — negeren */ }

    // ---- 3. E-mail met de QR-code (optioneel) -------------------
    if (sendEmail) {
      const userEmail = Session.getActiveUser().getEmail();
      if (userEmail) {
        const dynamicUrl = (cfg.REDIRECT_BASE || getScriptUrl()) + "?id=" + tempId;

        const mailOptions = {
          to: userEmail,
          subject: "Jouw QR-code: " + omschrijving,
          htmlBody:
            '<p>Beste,</p>' +
            '<p>Hierbij jouw zojuist gegenereerde QR-code voor <strong>' + omschrijving + '</strong>.</p>' +
            '<p>De QR verwijst naar: <a href="' + url + '">' + url + '</a><br>' +
            'Dynamische link: <a href="' + dynamicUrl + '">' + dynamicUrl + '</a></p>' +
            '<p>Je kan de doel-URL later aanpassen in de Google Sheet (kolom B).</p>' +
            '<p>Met vriendelijke groet,<br>HBO Genk</p>',
          attachments: [blob],
          name: "HBO Genk QR Generator"
        };
        if (cfg.EMAIL_AFZENDER) mailOptions.from = cfg.EMAIL_AFZENDER;
        MailApp.sendEmail(mailOptions);
      }
    }

    // ---- 4. Resultaat terugsturen -------------------------------
    return {
      success: true,
      dynamicUrl: (cfg.REDIRECT_BASE || getScriptUrl()) + "?id=" + tempId,
      fileId: file.getId()
    };

  } catch (err) {
    return { success: false, error: err.message + "\n" + (err.stack || "") };
  }
}