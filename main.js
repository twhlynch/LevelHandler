const { app, protocol, shell, Notification, Menu, Tray } = require('electron');
const path = require('path');
const fs = require('fs');
const protobuf = require('protobufjs');
const process = require('process');
const fileArg = process.argv.find(arg => arg.endsWith('.level'));

app.on('ready', () => {
  protocol.handle('file', (request, callback) => {
    let filePath;
    if (".level" in request.url) {
      filePath = request.url.replace('file:///', '').replace('file://', '');
    } else if (process.argv.length >= 2 && ".level" in process.argv[1]) {
      filePath = process.argv[1];
    }
    handleLevelFile(filePath);
  });

  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    handleLevelFile(filePath);
  });

  app.on('open-url', (event, filePath) => {
    event.preventDefault();
    handleLevelFile(filePath);
  });

  app.on('activate-with-no-open-windows', () => {
    app.quit();
  });
  
  app.on('activate', () => {
    app.quit();
  });

  if (fileArg) {
    handleLevelFile(fileArg);
  }
});

async function handleLevelFile(filePath) {
  console.log("File: ", filePath);

  const protoUrl = 'https://grab-tools.live/proto/proto.proto';

  const response = await fetch(protoUrl);
  const protoText = await response.text();
  const protoRoot = protobuf.parse(protoText).root;
  const LevelMessage = protoRoot.lookupType('COD.Level.Level');

  fs.readFile(filePath, (err, data) => {
    if (err) {
      new Notification({
        title: "Error",
        body: err.message
      }).show();
      return;
    }
    
    const decodedData = LevelMessage.decode(data);
    const jsonData = LevelMessage.toObject(decodedData, {
      longs: String,
      enums: String,
      bytes: String,
    });
    const baseFilePath = filePath.replace(".level", "");
    let jsonFilePath = baseFilePath;
    let i = 1;
    while (fs.existsSync(jsonFilePath + ".json")) {
      jsonFilePath = baseFilePath + "-" + i;
      i++;
    }
    new Notification({
      title: "GRAB Level",
      body: path.parse(filePath).base + " -> " + path.parse(jsonFilePath + ".json").base
    }).show();
    fs.writeFile(jsonFilePath + ".json", JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        new Notification({
          title: "Error",
          body: err.message
        }).show();
        return;
      }
      shell.openPath(jsonFilePath + ".json");
    });
  });
}