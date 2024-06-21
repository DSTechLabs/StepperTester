//=============================================================================
//
//     FILE : LocalServer.js
//
//  PROJECT : Any web project for local development/testing
//
//   AUTHOR : Bill Daniels
//            Copyright 2023, D+S Tech Labs, Inc.
//            All Rights Reserved
//
//=============================================================================

const Version = '2023.10.09';

//--- Browser Connection ---
const Express    = require ('express');
const WebApp     = Express ();
const WebAppPort = 3022;
const HttpServer = require ('http').Server (WebApp);


//=========================================================
//  Startup
//=========================================================

// console.info ('\n\x1B[37m\x1B[40m');
console.info ();
console.info ('▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀');
console.info ('   L O C A L   S E R V E R  (' + Version + ')');
console.info ();
console.info ('   Author: Bill Daniels');
console.info ('           Copyright 2023, D+S Tech Labs, Inc.');
console.info ('           All Rights Reserved.');
console.info ();
console.info ('           Use [Ctrl-C] to exit');
console.info ('▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄\n');

// Initialize Web Server
InitWebServer ();

// Catch the SIGINT interrupt [Ctrl-C] to close gracefully
process.on ('SIGINT', Close);


//=========================================================
//  InitWebServer
//=========================================================

function InitWebServer ()
{
  //--- Browser Communication ---------------------------

  // Set location of your web app
  // above the LocalServer folder:
  //
  //  (your web project folder)
  //    |
  //    +-- LocalServer

  WebApp.use (Express.static ("../"));

  // Start the web server
  HttpServer.listen (WebAppPort, () =>
  {
    console.info ('Listening for Web Browser on port [%s] ...', WebAppPort.toString());
    console.info ('Open a browser to URL \x1B[36m\x1B[1mlocalhost:%s\x1B[37m\x1B[0m\n', WebAppPort.toString());
  });
}

//--- Close -----------------------------------------------

function Close ()
{
  console.info ();
  console.info ('▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀');

  if (HttpServer != undefined)
    HttpServer.close ();

  console.info (' Local Server is closed.');
  console.info ('▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄');
  console.info ();

  // Let Node exit
  process.exit ();
}
