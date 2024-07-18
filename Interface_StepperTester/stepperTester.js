//=============================================================================
//
//    FILE  : stepperTester.js
//
//  PROJECT : Stepper Motor Tester
//
//  AUTHOR  : Bill Daniels
//            Copyright 2024, D+S Tech Labs, Inc.
//            All Rights Reserved
//
//=============================================================================

//--- Globals ---------------------------------------------

const dataWindow = $('#dataWindow');

let SerialPort   = undefined;
let SerialReader = undefined;
let SerialWriter = undefined;
let PortOpened   = false;

const SerialPortSettings =
{
  baudRate    : 115200,
  dataBits    : 8,
  stopBits    : 1,
  parity      : 'none',
  bufferSize  : 1024,
  flowControl : 'none'
};

let Homed    = false;
let Speed    = 1000;  // Steps per second
let Position = 0;     // Current absolute position (steps)

//--- class LineBreakTransformer --------------------------

class LineBreakTransformer
{
  constructor ()
  {
    this.container = '';
  }

  transform (chunk, controller)
  {
    this.container += chunk;
    const lines = this.container.split ('\r\n');
    this.container = lines.pop();
    lines.forEach (line => controller.enqueue(line));
  }

  flush (controller)
  {
    controller.enqueue (this.container);
  }
}

//--- StartUp ---------------------------------------------

try
{
  // Check if this browser supports serial communication
  if (!('serial' in navigator) || navigator.serial == undefined)
    throw ('This browser does not support serial communications.\nPlease use the Chrome browser.');

  // Close serial port before exit
  window.addEventListener ('beforeunload', async (event) =>
  {
    event.preventDefault  ();
    event.stopPropagation ();

    await ClosePort ();
  });

  // Add connect/disconnect event handling
  navigator.serial.addEventListener ('connect', (event) =>
  {
    console.debug ('Received connect event');
  });

  navigator.serial.addEventListener ('disconnect', (event) =>
  {
    console.debug ('Received disconnect event');
  });
}
catch (ex)
{
  ShowException (ex);
}

//--- ChoosePort ------------------------------------------

async function ChoosePort (event)
{
  try
  {
    // Disregard if port is already opened
    if (PortOpened)
      return;

    try
    {
      SerialPort = await navigator.serial.requestPort ();  // requestPort ({ filters });
    }
    catch (ex) { return; }  // ignore if no port choosen ('Failed to execute ...')

    if (SerialPort != undefined)
      await OpenPort ();
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- OpenPort --------------------------------------------

async function OpenPort ()
{
  try
  {
    if (SerialPort == undefined || PortOpened)
      return;

    // Open serial port
    try
    {
      await SerialPort.open (SerialPortSettings);
    }
    catch (ex)
    {
      ShowException (ex);

      await ClosePort ();
      return;
    }

    // Check if port/device is valid
    const portInfo = SerialPort.getInfo ();
    if (portInfo == undefined)
      throw ('Unable to connect to serial device.');

    if (portInfo.usbVendorId == undefined && portInfo.usbProductId == undefined)
      throw ('The serial device is not from a valid vendor.');

    // Port is open
    PortOpened = true;

    //=================================================
    //  Setup Serial Reader for text
    //=================================================
    // Pipe input data thru a UTF-8 text decoder and line handler
    SerialReader = SerialPort.readable
      .pipeThrough (new TextDecoderStream ())
      .pipeThrough (new TransformStream (new LineBreakTransformer ()))
      .getReader ();

    //=================================================
    //  Setup Serial Writer for text
    //=================================================
    const textEncoder = new TextEncoderStream ();
    textEncoder.readable.pipeTo (SerialPort.writable);
    SerialWriter = textEncoder.writable.getWriter ();


    // Hide choose button and show controls
    $('#intro'   ).hide ();
    $('#controls').show ();

    AddToLog ('Port opened');


    // Listen for incoming data
    await ReadLoop ();
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- ReadLoop --------------------------------------------

async function ReadLoop ()
{
  try
  {
    let readResult = { value:'', done:false };

    while (true)
    {
      readResult = await SerialReader.read ();

      if (readResult.done)
        throw ('SerialReader is done');

      // Process message from your device
      ProcessMessage (readResult.value);
    }
  }
  catch (error)
  {
    ShowException (error);
    await ClosePort ();
  }
}

//--- ProcessMessage -----------------------------------------

function ProcessMessage (message)
{
  try
  {
    AddToLog ('──▶ ' + message);

    // Check for 'ready'
    if (message.endsWith ('ready'))
    {
      // Set reasonable limits
      $('#lowerLimitField').val ('-20000');
      SetLower ();

      $('#upperLimitField').val ('20000');
      SetUpper ();
    }

    // Check for 'position = ...'
    const eqChar = message.indexOf ('= ');
    if (eqChar > 0)
    {
      const pos = message.substring (eqChar+2);
      $('#positionField' ).html (pos);
      $('#positionSlider').val  (pos);

      Position = parseInt (pos);
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- ClosePort -------------------------------------------

async function ClosePort ()
{
  try
  {
    if (SerialWorker != undefined)
    {
      SerialWorker.terminate ();
      SerialWorker = undefined;
    }

    if (SerialReader != undefined)
    {
      try { await SerialReader.cancel      (); } catch (ex) { }
      try {       SerialReader.releaseLock (); } catch (ex) { }
    }

    if (SerialWriter != undefined)
    {
      try { await SerialWriter.close       (); } catch (ex) { }
      try {       SerialWriter.releaseLock (); } catch (ex) { }
    }

    if (SerialPort != undefined)
    {
      try { await SerialPort.close (); } catch (ex) { }

      PortOpened = false;
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
}


//=========================================================
//  UI STUFF
//=========================================================

//--- CheckForEnter ---------------------------------------

function CheckForEnter (event, callFunction)
{
  try
  {
    if (event.keyCode == 13)
    {
      if (callFunction != undefined)
        callFunction ();
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- ToggleEnable ----------------------------------------

function ToggleEnable ()
{
  try
  {
    if ($("#enableSwitch").prop ('checked'))
    {
      // Enable motor
      // This also sets the HOME position (0)
      SendCommand ('EN');

      $('#positionField' ).html ('0');
      $('#positionSlider').val (0);
    }
    else
    {
      // Disable motor
      SendCommand ('DI');
      $('#positionField').html ('?');
    }

    Position = 0;
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- SetHome ---------------------------------------------

function SetHome ()
{
  try
  {
    SendCommand ('SH');
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- SetLower --------------------------------------------

function SetLower ()
{
  try
  {
    const lowerLimit = $('#lowerLimitField').val();
    SendCommand ('SL' + lowerLimit);

    $('#positionSlider').prop ('min', lowerLimit);
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- SetUpper --------------------------------------------

function SetUpper ()
{
  try
  {
    const upperLimit = $('#upperLimitField').val();
    SendCommand ('SU' + upperLimit);

    $('#positionSlider').prop ('max', upperLimit);
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- SetSpeedFromField -----------------------------------

function SetSpeedFromField ()
{
  try
  {
    const newSpeed = $('#speedField').val();
    Speed = parseInt(newSpeed);

    $('#speedSlider').val(newSpeed);
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- SetSpeedFromSlider ----------------------------------

function SetSpeedFromSlider ()
{
  try
  {
    const newSpeed = $('#speedSlider').val();
    Speed = parseInt(newSpeed);

    $('#speedField').val(newSpeed);
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- SetRamp ---------------------------------------------

function SetRamp ()
{
  try
  {
    const ramp = $('#rampSlider').val();
    SendCommand ('SR' + ramp);
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- GoTo ------------------------------------------------

function GoTo ()
{
  try
  {
    const newPosition = $('#positionSlider').val();

    if (parseInt(newPosition) != Position)
    {
      SendCommand ('RA' + (Speed.toString().padRight(' ', 4)) + newPosition);  // speed must be 4 chars
      $('#positionField').html ('running ...');
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- GoHome ----------------------------------------------

function GoHome ()
{
  try
  {
    if (Position != 0)
    {
      SendCommand ('RH');
      $('#positionField').html ('running ...');
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- GoLower ---------------------------------------------

function GoLower ()
{
  try
  {
    if (Position != parseInt($('#lowerLimitField').val()))
    {
      SendCommand ('RL');
      $('#positionField').html ('running ...');
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- GoUpper ---------------------------------------------

function GoUpper ()
{
  try
  {
    if (Position != parseInt($('#upperLimitField').val()))
    {
      SendCommand ('RU');
      $('#positionField').html ('running ...');
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- GoRelativeBack --------------------------------------

function GoRelativeBack ()
{
  try
  {
    const steps = $("#relativeField").val();
    if (parseInt(steps) != 0)
    {
      SendCommand ('RR' + (Speed.toString().padRight(' ', 4)) + '-' + steps);  // speed must be 4 chars
      $('#positionField').html ('running ...');
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- GoRelativeForward -----------------------------------

function GoRelativeForward ()
{
  try
  {
    const steps = $("#relativeField").val();
    if (parseInt(steps) != 0)
    {
      SendCommand ('RR' + (Speed.toString().padRight(' ', 4)) + steps);  // speed must be 4 chars
      $('#positionField').html ('running ...');
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- EStop -----------------------------------------------

function EStop ()
{
  try
  {
    SendCommand ('ES');
    $('#enableSwitch').prop ('checked', false);
    $('#positionField').html ('?');
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- SendCommand -----------------------------------------

function SendCommand (command)
{
  try
  {
    SerialWriter.write (command + '\n');
    AddToLog ('◀── ' + command);
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- SendCommandField ------------------------------------

function SendCommandField ()
{
  try
  {
    SendCommand ($('#commandField').val());
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- AddToLog --------------------------------------------

function AddToLog (htmlMessage)
{
  try
  {
    dataWindow.append (htmlMessage + '<br>');
    dataWindow.scrollTop (Number.MAX_SAFE_INTEGER);
  }
  catch (ex)
  {
    alert (ex);
  }
}
