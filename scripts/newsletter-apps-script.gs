/**
 * The newsletter sheet's Apps Script — the studio's own Sheet-writing
 * system (the same doPost the Pujol site uses), here for the ceramic
 * brussels newsletter signup (src/server/routes/newsletter.ts).
 *
 * SETUP (once, in the Google account that owns the sheet — Roy or the client):
 *
 *  1. Create a Google Sheet (e.g. "ceramic brussels — newsletter") with one
 *     tab named exactly `Newsletter`. Headers are optional: the script adds
 *     any header the payload carries (Date, Email, Language, Source).
 *  2. In the sheet: Extensions → Apps Script, paste this whole file over
 *     the default Code.gs.
 *  3. Deploy → New deployment → type "Web app":
 *       - Execute as: Me
 *       - Who has access: Anyone
 *     Copy the /exec URL.
 *  4. The URL is a write credential — anyone holding it can add rows. It
 *     goes in the Cloudflare Pages secret `NEWSLETTER_SHEETS_URL`
 *     (production; previews keep APPLY_DRY_RUN) and in `.env` for local
 *     tries. Never in Sanity: the dataset is world-readable.
 *  5. Try it from the shell, then look at the sheet:
 *       curl -L -d '{"tab":"Newsletter","key":"Email","data":{"Date":"test","Email":"test@example.com","Language":"EN","Source":"curl"}}' <exec url>
 *
 * The contract, shared with the route:
 *   { tab, row: [...] }                         → append a row
 *   { tab, key, data: {Header: value}, writeOnce: [...] }
 *                                               → upsert by the key column
 *   { tab, key, records: [...], updateOnly: true } → batch-update, no inserts
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // serialise concurrent signups
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(data.tab);
    if (!sheet) {
      return json({ ok: false, error: 'Tab not found: ' + data.tab });
    }

    // ── Plain append: { tab, row: [...] } ──
    if (data.row) {
      sheet.appendRow(data.row);
      return json({ ok: true, mode: 'append' });
    }

    // ── Batch update existing rows: { tab, key, records, updateOnly } ──
    if (Array.isArray(data.records)) {
      var batchLastCol = Math.max(1, sheet.getLastColumn());
      var batchHeaders = sheet.getRange(1, 1, 1, batchLastCol).getValues()[0]
                              .map(function (h) { return String(h).trim(); });
      var batchKeyCol = batchHeaders.indexOf(data.key);
      if (batchKeyCol === -1) return json({ ok: false, error: 'Key header not found: ' + data.key });

      var batchLastRow = sheet.getLastRow();
      var rowsByKey = {};
      if (batchLastRow <= 1) {
        return json({ ok: true, mode: 'batch-update', matchedRecords: 0, updatedRows: 0 });
      }
      var batchKeys = sheet.getRange(2, batchKeyCol + 1, batchLastRow - 1, 1).getValues();
      batchKeys.forEach(function (row, i) {
        var value = String(row[0]).trim().toLowerCase();
        if (!value) return;
        if (!rowsByKey[value]) rowsByKey[value] = [];
        rowsByKey[value].push(i + 2);
      });

      var batchWriteOnce = Array.isArray(data.writeOnce) ? data.writeOnce : [];
      var matchedRecords = 0;
      var updatedRows = 0;
      var updateColumns = {};
      var missingHeaders = {};
      data.records.forEach(function (record) {
        Object.keys(record).forEach(function (h) {
          if (h === data.key) return;
          if (batchHeaders.indexOf(h) === -1) missingHeaders[h] = true;
          else updateColumns[h] = true;
        });
      });
      var missingHeaderNames = Object.keys(missingHeaders);
      if (missingHeaderNames.length) {
        return json({ ok: false, error: 'Headers not found: ' + missingHeaderNames.join(', ') });
      }
      var columnValues = {};
      Object.keys(updateColumns).forEach(function (h) {
        var columnIndex = batchHeaders.indexOf(h);
        columnValues[h] = sheet.getRange(2, columnIndex + 1, Math.max(0, batchLastRow - 1), 1).getValues();
      });

      data.records.forEach(function (record) {
        var recordKey = String(record[data.key] || '').trim().toLowerCase();
        var matchingRows = rowsByKey[recordKey] || [];
        if (!matchingRows.length) return; // updateOnly: never insert
        matchedRecords++;
        matchingRows.forEach(function (rowIndex) {
          Object.keys(updateColumns).forEach(function (h) {
            if (!Object.prototype.hasOwnProperty.call(record, h) || !String(record[h]).length) return;
            var valueIndex = rowIndex - 2;
            if (batchWriteOnce.indexOf(h) !== -1 && String(columnValues[h][valueIndex][0]).length) return;
            columnValues[h][valueIndex][0] = record[h];
          });
          updatedRows++;
        });
      });
      Object.keys(updateColumns).forEach(function (h) {
        var columnIndex = batchHeaders.indexOf(h);
        sheet.getRange(2, columnIndex + 1, batchLastRow - 1, 1).setValues(columnValues[h]);
      });
      return json({ ok: true, mode: 'batch-update', matchedRecords: matchedRecords, updatedRows: updatedRows });
    }

    // ── Upsert by key: { tab, key: 'Email', data: { Header: value, ... } } ──
    if (data.data) {
      var lastCol = Math.max(1, sheet.getLastColumn());
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
                         .map(function (h) { return String(h).trim(); });

      // Add any header present in the payload but missing from the sheet.
      Object.keys(data.data).forEach(function (h) {
        if (headers.indexOf(h) === -1) {
          sheet.getRange(1, headers.length + 1).setValue(h);
          headers.push(h);
        }
      });

      var keyCol = Math.max(0, headers.indexOf(data.key));
      var keyVal = String(data.data[data.key] || '').trim().toLowerCase();
      var lastRow = sheet.getLastRow();
      var rowIndexes = [];

      if (lastRow > 1 && keyVal) {
        var col = sheet.getRange(2, keyCol + 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < col.length; i++) {
          if (String(col[i][0]).trim().toLowerCase() === keyVal) rowIndexes.push(i + 2);
        }
      }

      if (!rowIndexes.length) { // insert new row
        sheet.appendRow(headers.map(function (h) {
          return Object.prototype.hasOwnProperty.call(data.data, h) ? data.data[h] : '';
        }));
        return json({ ok: true, mode: 'insert' });
      }

      var writeOnce = Array.isArray(data.writeOnce) ? data.writeOnce : [];
      rowIndexes.forEach(function (rowIndex) {
        headers.forEach(function (h, c) { // update all matching duplicate rows
          if (!Object.prototype.hasOwnProperty.call(data.data, h) || !String(data.data[h]).length) return;
          var cell = sheet.getRange(rowIndex, c + 1);
          if (writeOnce.indexOf(h) !== -1 && String(cell.getValue()).length) return;
          cell.setValue(data.data[h]);
        });
      });
      return json({ ok: true, mode: 'update', rows: rowIndexes.length });
    }

    return json({ ok: false, error: 'no row or data' });
  } catch (err) {
    return json({ ok: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Run this in the editor to test end-to-end (writes to the Newsletter tab).
function testDoPost() {
  Logger.log(doPost({ postData: { contents: JSON.stringify({
    tab: 'Newsletter', key: 'Email',
    data: { Date: '2026-10-02 12:00:00', Email: 'test@example.com', Language: 'EN', Source: 'editor test' },
    writeOnce: ['Date']
  }) } }).getContent());
}
