function doGet() {
  var executionLogs = [];
  executionLogs.push("GET: Fetching Events Started");
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var eventSheet = ss.getSheetByName("Events");
    var statsSheet = ss.getSheetByName("EventStats");
    
    if (!eventSheet || !statsSheet) throw new Error("Required sheets are missing.");

    var eventData = eventSheet.getDataRange().getValues();
    var statsData = statsSheet.getDataRange().getValues();
    var headers = eventData[0];
    
    var statsMap = {};
    for (var i = 1; i < statsData.length; i++) {
      var sId = statsData[i][0].toString().trim();
      statsMap[sId] = Number(statsData[i][1]) || 0;
    }
    
    var result = eventData.slice(1).map(function(row) {
      var obj = {};
      headers.forEach(function(h, idx) {
        var val = row[idx];
        obj[h.toString().trim()] = (val instanceof Date) ? val.toISOString() : val;
      });
      
      var id = obj["ID"] ? obj["ID"].toString().trim() : "";
      obj["currentAmountAttendees"] = statsMap[id] || 0;
      return obj;
    }).filter(function(o) { return o.ID !== "" && o.ID !== undefined; });

    executionLogs.push("GET: Successfully found " + result.length + " events.");
    return createJSONResponse("success", result, executionLogs);
  } catch (e) {
    executionLogs.push("GET Error: " + e.toString());
    return createJSONResponse("error", e.toString(), executionLogs);
  }
}

function doPost(e) {
  var executionLogs = [];
  executionLogs.push("--- POST START ---");
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action; 
    var deviceId = data.deviceId;
    var eventId = data.eventId.toString().trim();
    
    executionLogs.push("Action: " + action + " | EventID: " + eventId);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var attendeeSheet = ss.getSheetByName("Attendees");
    var eventSheet = ss.getSheetByName("Events");
    var statsSheet = ss.getSheetByName("EventStats");

    // 1. DYNAMIC COLUMN MAPPING
    var eventHeaders = eventSheet.getRange(1, 1, 1, eventSheet.getLastColumn()).getValues()[0];
    var colIdxID = -1;
    var colIdxMax = -1;
    
    for (var n = 0; n < eventHeaders.length; n++) {
      var h = eventHeaders[n].toString().trim();
      if (h === "ID") colIdxID = n;
      if (h === "MaxAttendies") colIdxMax = n;
    }

    executionLogs.push("Mapping Results -> ID Col Index: " + colIdxID + " | Max Col Index: " + colIdxMax);
    if (colIdxID === -1) throw new Error("ID column not found in Events sheet");
    
    // 2. GET DATA
    var eventData = eventSheet.getDataRange().getValues();
    var maxAttendees = 0;
    var foundEvent = false;
    for (var i = 1; i < eventData.length; i++) {
      if (eventData[i][colIdxID].toString().trim() === eventId) {
        maxAttendees = Number(eventData[i][colIdxMax]) || 0;
        foundEvent = true;
        break;
      }
    }
    executionLogs.push("Event Found in List: " + foundEvent + " | Max Capacity: " + maxAttendees);

    var statsData = statsSheet.getDataRange().getValues();
    var statsRowIndex = -1;
    var currentCount = 0;
    for (var j = 1; j < statsData.length; j++) {
      if (statsData[j][0].toString().trim() === eventId) {
        statsRowIndex = j + 1;
        currentCount = Number(statsData[j][1]) || 0;
        break;
      }
    }

    if (statsRowIndex === -1) {
      executionLogs.push("ID not found in EventStats. Appending new row.");
      statsSheet.appendRow([eventId, 0]);
      statsRowIndex = statsSheet.getLastRow();
    }
    executionLogs.push("Stats Row Index: " + statsRowIndex + " | Current Count: " + currentCount);

    var attRows = attendeeSheet.getDataRange().getValues();
    var foundAttIndex = -1;
    var userStatus = "";
    for (var k = 1; k < attRows.length; k++) {
      if (attRows[k][1].toString().trim() === eventId && attRows[k][2] === deviceId) {
        foundAttIndex = k + 1;
        userStatus = attRows[k][4];
        break;
      }
    }
    executionLogs.push("User current status in Attendees: " + (userStatus || "Never joined"));

    // 3. LOGIC
    if (action === "join") {
      if (userStatus === "Joined") {
        executionLogs.push("Operation Aborted: User already joined.");
        return createJSONResponse("success", "Already joined", executionLogs);
      }
      if (maxAttendees > 0 && currentCount >= maxAttendees) {
        executionLogs.push("Operation Aborted: Full Capacity.");
        return createJSONResponse("error", "Event no longer can be joined", executionLogs);
      }
      
      executionLogs.push("Increasing EventStats count to " + (currentCount + 1));
      statsSheet.getRange(statsRowIndex, 2).setValue(currentCount + 1);
      
      if (foundAttIndex > -1) {
        attendeeSheet.getRange(foundAttIndex, 5).setValue("Joined");
      } else {
        attendeeSheet.appendRow([new Date(), eventId, deviceId, "", "Joined"]);
      }
    } else if (action === "leave") {
      if (userStatus === "Joined") {
        var newCount = Math.max(0, currentCount - 1);
        executionLogs.push("Decreasing EventStats count to " + newCount);
        statsSheet.getRange(statsRowIndex, 2).setValue(newCount);
        attendeeSheet.getRange(foundAttIndex, 5).setValue("Left");
      } else {
        executionLogs.push("Operation Aborted: User wasn't in Joined status.");
      }
    }

    executionLogs.push("POST Finished Successfully.");
    return createJSONResponse("success", "Updated", executionLogs);
  } catch (err) {
    executionLogs.push("CRITICAL ERROR: " + err.toString());
    return createJSONResponse("error", err.toString(), executionLogs);
  }
}

function createJSONResponse(status, payload, logs) {
  var out = { 
    status: status,
    debug_logs: logs 
  };
  status === "success" ? out.data = payload : out.message = payload;
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}