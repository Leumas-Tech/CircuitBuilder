
const express = require('express');
const { getEmbedding } = require('./embedding-helper.js');
const { getLeumasEmbedding } = require('./leumas-embedding-manager.js');
const { tools, dispatchFunctionCall, setGlobalPinConfig } = require('./ai-functions.js');
const OpenAI = require('openai');
const openai = new OpenAI(); // Reads OPENAI_API_KEY from process.env
const app = express();
const port = 42389;
require('dotenv').config();

app.use(express.json());

const path = require('path');
const fs = require('fs');

const CIRCUITS_DIR = path.join(__dirname, '..', 'circuits');
const CIRCUIT_ASSETS_BASE_DIR = path.join(__dirname, '..', 'circuit_assets');

// Ensure circuits directory exists
if (!fs.existsSync(CIRCUITS_DIR)) {
  fs.mkdirSync(CIRCUITS_DIR, { recursive: true });
}

// Ensure circuit assets base directory exists
if (!fs.existsSync(CIRCUIT_ASSETS_BASE_DIR)) {
  fs.mkdirSync(CIRCUIT_ASSETS_BASE_DIR, { recursive: true });
}

app.get('/api/circuits', (req, res) => {
  fs.readdir(CIRCUITS_DIR, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error('Error reading circuits directory:', err);
      return res.status(500).send('Error reading circuits directory.');
    }

    const circuitFolders = files.filter(dirent => dirent.isDirectory());
    const circuitPromises = circuitFolders.map(folder => {
      const circuitFilePath = path.join(CIRCUITS_DIR, folder.name, 'circuit.json');
      return fs.promises.readFile(circuitFilePath, 'utf8')
        .then(JSON.parse)
        .catch(readErr => {
          console.warn(`Could not read or parse ${circuitFilePath}:`, readErr);
          return null; // Return null for unreadable/unparsable files
        });
    });

    Promise.all(circuitPromises)
      .then(circuits => {
        res.json(circuits.filter(c => c !== null)); // Filter out nulls
      })
      .catch(promiseErr => {
        console.error('Error processing circuit files:', promiseErr);
        res.status(500).send('Error processing circuit files.');
      });
  });
});

app.post('/api/embedding-manager', (req, res) => {
  const { manager } = req.body;
  if (manager === 'default' || manager === 'leumas') {
    activeEmbeddingManager = manager;
    updateEmbeddings();
    res.status(200).send(`Embedding manager switched to ${manager}`);
  } else {
    res.status(400).send('Invalid embedding manager');
  }
});

app.post('/api/ai-chat', async (req, res) => {
  const { message, currentCircuit } = req.body;
  console.log('Received AI chat message:', message);

  let aiResponse = { text: "" };
  let functionCallResult = null;

  // ✅ Use fullPins from frontend — don’t rebuild them here
  const sanitizedNodes = currentCircuit.nodes.map(node => ({
    id: node.id,
    name: node.name || node.type,
    type: node.type,
    variables: node.variables || [],
    fullPins: node.fullPins || [] // <- this is critical
  }));

  const sanitizedConnections = currentCircuit.connections || [];

  // ✅ Serialize safely
  let safeNodeJson = '[]';
  let safeConnectionJson = '[]';

  try {
    safeNodeJson = JSON.stringify(sanitizedNodes, null, 2);
    safeConnectionJson = JSON.stringify(sanitizedConnections, null, 2);
  } catch (err) {
    console.error('Serialization error:', err);
  }

  const messages = [
    {
      role: 'system',
      content: `
You are a helpful assistant that automatically wires digital circuits.

You will receive:
- A list of circuit nodes (components) with all of their pins under \`fullPins\`
- A list of existing connections (do not duplicate them)

Your job is to return a function call to \`wireComponents\` that includes new connections between compatible pins.

Here are the components:
${safeNodeJson}

Here are the existing connections:
${safeConnectionJson}

Wiring rules:
- Match power (VCC, 3.3V, 5V) to VCC-type pins
- Match GND to GND
- Match SPI/I2C/UART protocols when possible
- Use logical defaults for modules (e.g. wire a Joystick’s SW to a digital pin)
- Avoid duplicates from existing connections

- Ensure every components GND and VCC pins are connected and use colors to coordinate connections.

Respond only with the tool call \`wireComponents\`. Do not ask questions or request more info unless absolutely required.
`
    },
    {
      role: 'user',
      content: message
    }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      if (functionName === 'wireComponents') {
        functionArgs.nodes = sanitizedNodes;
        functionArgs.currentConnections = sanitizedConnections;
      }

      functionCallResult = await dispatchFunctionCall({
        name: functionName,
        arguments: functionArgs
      });

      aiResponse.text = `✅ Executed: ${functionName}`;
    } else {
      aiResponse.text = responseMessage.content;
    }

  } catch (error) {
    console.error('❌ OpenAI error:', error);
    aiResponse.text = `Error: ${error.message}`;
  }

  res.status(200).json({ aiResponse, functionCallResult });
});


app.post('/api/circuits', (req, res) => {
  let circuitData = req.body;
  let circuitId = circuitData.id;

  if (!circuitId) {
    circuitId = Date.now().toString();
    circuitData.id = circuitId;
  }

  const circuitFolderPath = path.join(CIRCUITS_DIR, circuitId);
  const circuitFilePath = path.join(circuitFolderPath, 'circuit.json');

  // Ensure circuit-specific folder exists
  if (!fs.existsSync(circuitFolderPath)) {
    fs.mkdirSync(circuitFolderPath, { recursive: true });
  }

  // Save full circuit data to its own file
  fs.writeFile(circuitFilePath, JSON.stringify(circuitData, null, 2), (err) => {
    if (err) {
      console.error('Error saving circuit data:', err);
      return res.status(500).send('Error saving circuit data.');
    }

    // Handle asset folder creation (now relative to CIRCUIT_ASSETS_BASE_DIR)
    if (circuitData.assetFolder) {
      const assetFolderPathFull = path.join(CIRCUIT_ASSETS_BASE_DIR, circuitData.assetFolder);
      if (!fs.existsSync(assetFolderPathFull)) {
        fs.mkdirSync(assetFolderPathFull, { recursive: true });
        console.log(`Created asset folder: ${assetFolderPathFull}`);
      }
    }

    // After saving, update embeddings
    updateEmbeddings();
    res.status(200).json(circuitData); // Return the saved/updated circuit data
  });
});



const COMPONENTS_DIR = path.join(__dirname, '..', 'components');

// Ensure directories exist
if (!fs.existsSync(CIRCUITS_DIR)) {
  fs.mkdirSync(CIRCUITS_DIR, { recursive: true });
}
if (!fs.existsSync(CIRCUIT_ASSETS_BASE_DIR)) {
  fs.mkdirSync(CIRCUIT_ASSETS_BASE_DIR, { recursive: true });
}

let serverPinConfig = {};
let componentEmbeddings = {};
let circuitEmbeddings = {};
let activeEmbeddingManager = 'default';

// Function to load all component definitions into serverPinConfig
async function loadComponentDefinitions() {
  serverPinConfig = {}; // Clear existing config
  const componentTypes = ['microcontrollers', 'components', 'modules'];

  for (const type of componentTypes) {
    const typeDir = path.join(COMPONENTS_DIR, type);
    if (fs.existsSync(typeDir)) {
      const files = fs.readdirSync(typeDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(typeDir, file);
          try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            serverPinConfig[data.name] = { ...data, type }; // Store with component name as key
          } catch (err) {
            console.error(`Error parsing component file ${filePath}:`, err);
          }
        }
      }
    }
  }
  console.log('Component definitions loaded for server-side use.');
  setGlobalPinConfig(serverPinConfig);
}

async function updateEmbeddings() {
  console.log(`Updating embeddings with ${activeEmbeddingManager} manager...`);
  componentEmbeddings = {};
  circuitEmbeddings = {};

  const getEmbeddingForManager = activeEmbeddingManager === 'leumas' ? getLeumasEmbedding : getEmbedding;

  // Components
  const componentTypes = ['microcontrollers', 'components', 'modules'];
  for (const type of componentTypes) {
    const typeDir = path.join(COMPONENTS_DIR, type);
    if (fs.existsSync(typeDir)) {
      const files = fs.readdirSync(typeDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(typeDir, file);
          try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const componentDescription = `Component: ${data.name}, Type: ${data.type}, Pins: ${data.pins.map(p => p.name).join(', ')}`;
            componentEmbeddings[data.name] = await getEmbeddingForManager(componentDescription);
          } catch (err) {
            console.error(`Error processing component file for embedding ${filePath}:`, err);
          }
        }
      }
    }
  }

  // Circuits
  if (fs.existsSync(CIRCUITS_DIR)) {
    const circuitFolders = fs.readdirSync(CIRCUITS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory());

    for (const folder of circuitFolders) {
      const circuitFilePath = path.join(CIRCUITS_DIR, folder.name, 'circuit.json');
      if (fs.existsSync(circuitFilePath)) {
        try {
          const circuitData = JSON.parse(fs.readFileSync(circuitFilePath, 'utf8'));
          const circuitDescription = `Circuit: ${circuitData.id}, Nodes: ${circuitData.nodes.map(n => n.name).join(', ')}`;
          circuitEmbeddings[circuitData.id] = await getEmbeddingForManager(circuitDescription);
        } catch (readErr) {
          console.warn(`Could not read or parse circuit for embedding ${circuitFilePath}:`, readErr);
        }
      }
    }
  }
  console.log('Embeddings updated.');
}

// Load component definitions and embeddings on startup
async function startup() {
  await loadComponentDefinitions();
  await updateEmbeddings();
}

startup();

// Re-load component definitions if a new component is added/updated
// (This is a simplified approach; a more robust solution might involve watching the directory)
app.post('/api/components', async (req, res, next) => {
  // Original component saving logic
  const { name, type, pins, originalName, originalType } = req.body;

  if (!name || !type || !pins) {
    return res.status(400).send('Missing required component data.');
  }

  const componentDir = path.join(COMPONENTS_DIR, type);
  const componentFile = path.join(componentDir, `${name.toLowerCase().replace(/\s+/g, '-')}.json`);

  if (originalName && originalType && (originalName !== name || originalType !== type)) {
    const oldComponentDir = path.join(COMPONENTS_DIR, originalType);
    const oldComponentFile = path.join(oldComponentDir, `${originalName.toLowerCase().replace(/\s+/g, '-')}.json`);
    if (fs.existsSync(oldComponentFile)) {
      fs.unlinkSync(oldComponentFile);
    }
  }

  const componentData = JSON.stringify({ name, type, pins }, null, 2);

  fs.writeFile(componentFile, componentData, (err) => {
    if (err) {
      console.error('Error saving component:', err);
      return res.status(500).send('Error saving component.');
    }
    // After saving, reload component definitions and update embeddings
    loadComponentDefinitions();
    updateEmbeddings();
    res.status(201).send(componentData);
  });
});


app.get('/api/components', (req, res) => {
  const componentsDir = path.join(__dirname, '..', 'components');
  const componentTypes = ['microcontrollers', 'components', 'modules'];

  const readPromises = componentTypes.flatMap(type => {
    const typeDir = path.join(componentsDir, type);
    try {
      return fs.readdirSync(typeDir).map(file => {
        const filePath = path.join(typeDir, file);
        return fs.promises.readFile(filePath, 'utf8').then(JSON.parse).then(data => ({ ...data, type }));
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // Directory doesn't exist, skip
      } else {
        throw error;
      }
    }
  });

  Promise.all(readPromises)
    .then(componentsArray => {
      res.json(componentsArray.flat());
    })
    .catch(err => {
      console.error("Error reading component files:", err);
      res.status(500).send('Error reading component files');
    });
});

app.get('/api/circuits/:id', (req, res) => {
  const circuitId = req.params.id;
  const circuitFilePath = path.join(CIRCUITS_DIR, circuitId, 'circuit.json');

  fs.readFile(circuitFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading circuit file:', err);
      return res.status(404).send('Circuit not found'); // 404 if file doesn't exist
    }
    try {
      res.json(JSON.parse(data));
    } catch (parseErr) {
      console.error('Error parsing circuit file:', parseErr);
      res.status(500).send('Error parsing circuit file.');
    }
  });
});

app.get('/api/circuits/:id/open_folder', (req, res) => {
  const circuitId = req.params.id;
  const circuitFolderPath = path.join(CIRCUITS_DIR, circuitId);

  if (!fs.existsSync(circuitFolderPath)) {
    return res.status(404).send('Circuit folder not found.');
  }

  let command;
  switch (process.platform) {
    case 'darwin': // macOS
      command = `open "${circuitFolderPath}"`;
      break;
    case 'win32': // Windows
      command = `start "" "${circuitFolderPath}"`;
      break;
    default: // Linux and others
      command = `xdg-open "${circuitFolderPath}"`;
      break;
  }

  require('child_process').exec(command, (error) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send('Failed to open folder.');
    }
    res.status(200).send('Folder opened successfully.');
  });
});

// Helper to generate KiCad Netlist content
function generateKiCadNetlistContent(circuitData) {
  let componentsSection = '';
  let netsSection = '';
  let netCode = 0;
  const netMap = new Map(); // Maps pin connections to a unique net code

  // Components
  circuitData.nodes.forEach(node => {
    const nodeIdStr = String(node.id); // Ensure node.id is a string
    const componentName = node.name || node.type;
    const componentRef = componentName.replace(/\s+/g, '').toUpperCase().substring(0, 4) + nodeIdStr.substring(nodeIdStr.length - 4);
    const footprint = `Package_DIP:${componentName.replace(/\s+/g, '')}_${node.w}x${node.h}mm`; // Placeholder footprint
    const libsource = `Device:${componentName}`;

    componentsSection += `
    (comp (ref ${componentRef})
      (value ${componentName})
      (footprint ${footprint})
      (libsource (lib ${libsource}) (part ${componentName}) (description "${componentName}"))
      (sheetpath (names /) (tstamps /))
      (tstamp ${nodeIdStr}))`;
  });

  // Nets
  circuitData.connections.forEach(conn => {
    const fromNode = circuitData.nodes.find(n => n.id === conn.from.nodeId);
    const toNode = circuitData.nodes.find(n => n.id === conn.to.nodeId);
    if (!fromNode || !toNode) return;

    // Use serverPinConfig to get pin names
    const fromPinName = serverPinConfig[fromNode.name].pins[conn.from.pinIdx].name;
    const toPinName = serverPinConfig[toNode.name].pins[conn.to.pinIdx].name;

    const fromRef = (fromNode.name || fromNode.type).replace(/\s+/g, '').toUpperCase().substring(0, 4) + String(fromNode.id).substring(String(fromNode.id).length - 4);
    const toRef = (toNode.name || toNode.type).replace(/\s+/g, '').toUpperCase().substring(0, 4) + String(toNode.id).substring(String(toNode.id).length - 4);

    const pin1Key = `${fromRef}-${fromPinName}`;
    const pin2Key = `${toRef}-${toPinName}`;

    let currentNetCode;
    if (netMap.has(pin1Key)) {
      currentNetCode = netMap.get(pin1Key);
    } else if (netMap.has(pin2Key)) {
      currentNetCode = netMap.get(pin2Key);
    } else {
      netCode++;
      currentNetCode = netCode;
    }

    netMap.set(pin1Key, currentNetCode);
    netMap.set(pin2Key, currentNetCode);
  });

  // Group pins by net code
  const nets = new Map();
  for (const [code, pinKeys] of netMap.entries()) {
    if (!nets.has(code)) {
      nets.set(code, []);
    }
    nets.get(code).push(pinKeys);
  }

  for (const [code, pinKeys] of nets.entries()) {
    const netName = `Net-(U${code})`; // Generic net name
    netsSection += `
    (net (code ${code}) (name "${netName}")`;
    pinKeys.forEach(pinKey => {
      const [ref, pin] = pinKey.split('-');
      netsSection += `
      (node (ref ${ref}) (pin ${pin}))`;
    });
    netsSection += `
    )`;
  }

  return `(export (version D)
  (components${componentsSection}
  )
  (nets${netsSection}
  )
)`;
}

app.get('/api/circuits/:id/kicad_netlist', (req, res) => {
  const circuitId = req.params.id;
  const circuitFilePath = path.join(CIRCUITS_DIR, circuitId, 'circuit.json');

  fs.readFile(circuitFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading circuit file:', err);
      return res.status(404).send('Circuit not found');
    }
    try {
      const circuitData = JSON.parse(data);
      const kicadNetlistContent = generateKiCadNetlistContent(circuitData);
      const netlistFileName = `circuit_${circuitId}.net`;
      const netlistFilePath = path.join(CIRCUITS_DIR, circuitId, netlistFileName);

      fs.writeFile(netlistFilePath, kicadNetlistContent, (writeErr) => {
        if (writeErr) {
          console.error('Error writing KiCad netlist file:', writeErr);
          return res.status(500).send('Error writing KiCad netlist file.');
        }
        res.download(netlistFilePath, netlistFileName, (downloadErr) => {
          if (downloadErr) {
            console.error('Error downloading KiCad netlist file:', downloadErr);
            res.status(500).send('Error downloading KiCad netlist file.');
          }
        });
      });

    } catch (parseErr) {
      console.error('Error parsing circuit file or generating netlist:', parseErr);
      res.status(500).send('Error processing circuit data.');
    }
  });
});

app.get('/api/circuits/:id/open_kicad', (req, res) => {
  const circuitId = req.params.id;
  const circuitFilePath = path.join(CIRCUITS_DIR, circuitId, 'circuit.json');

  fs.readFile(circuitFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading circuit file:', err);
      return res.status(404).send('Circuit not found');
    }
    try {
      const circuitData = JSON.parse(data);
      const kicadNetlistContent = generateKiCadNetlistContent(circuitData);
      const netlistFileName = `circuit_${circuitId}.net`;
      const netlistFilePath = path.join(CIRCUITS_DIR, circuitId, netlistFileName);

      fs.writeFile(netlistFilePath, kicadNetlistContent, (writeErr) => {
        if (writeErr) {
          console.error('Error writing KiCad netlist file:', writeErr);
          return res.status(500).send('Error writing KiCad netlist file.');
        }

        let command;
        switch (process.platform) {
          case 'darwin': // macOS
            command = `open -a "/Applications/KiCad/KiCad.app" "${netlistFilePath}"`; // Adjust path for your KiCad installation
            break;
          case 'win32': // Windows
            command = `start "" "D:\\KiCad\\bin\\kicad.exe" "${netlistFilePath}"`; // Adjust path for your KiCad installation
            break;
          default: // Linux and others
            command = `kicad "${netlistFilePath}"`; // Assumes kicad is in PATH
            break;
        }

        require('child_process').exec(command, (execErr) => {
          if (execErr) {
            console.error(`exec error: ${execErr}`);
            return res.status(500).send('Failed to open KiCad. Make sure it\'s installed and in your PATH, or adjust the path in server.js.');
          }
          res.status(200).send('KiCad opened successfully.');
        });
      });

    } catch (parseErr) {
      console.error('Error parsing circuit file or generating netlist:', parseErr);
      res.status(500).send('Error processing circuit data.');
    }
  });
});











// API to list code files for a circuit
app.get('/api/circuit-code/:assetFolder', (req, res) => {
  const assetFolder = req.params.assetFolder;
  const fullAssetPath = path.join(CIRCUIT_ASSETS_BASE_DIR, assetFolder);

  fs.readdir(fullAssetPath, { withFileTypes: true }, (err, files) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).send('Asset folder not found.');
      }
      console.error(`Error reading asset folder ${fullAssetPath}:`, err);
      return res.status(500).send('Error reading asset folder.');
    }
    const fileNames = files.filter(dirent => dirent.isFile()).map(dirent => dirent.name);
    res.json(fileNames);
  });
});

// API to read a specific code file
app.get('/api/circuit-code/:assetFolder/:filename', (req, res) => {
  const assetFolder = req.params.assetFolder;
  const filename = req.params.filename;
  const filePath = path.join(CIRCUIT_ASSETS_BASE_DIR, assetFolder, filename);

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).send('File not found.');
      }
      console.error(`Error reading file ${filePath}:`, err);
      return res.status(500).send('Error reading file.');
    }
    res.send(data);
  });
});

// API to save a specific code file
app.post('/api/circuit-code/:assetFolder/:filename', (req, res) => {
  const assetFolder = req.params.assetFolder;
  const filename = req.params.filename;
  const content = req.body.content;
  const filePath = path.join(CIRCUIT_ASSETS_BASE_DIR, assetFolder, filename);

  // Ensure the asset folder exists before writing the file
  const fullAssetPath = path.join(CIRCUIT_ASSETS_BASE_DIR, assetFolder);
  if (!fs.existsSync(fullAssetPath)) {
    fs.mkdirSync(fullAssetPath, { recursive: true });
  }

  fs.writeFile(filePath, content, 'utf8', (err) => {
    if (err) {
      console.error(`Error writing file ${filePath}:`, err);
      return res.status(500).send('Error saving file.');
    }
    res.status(200).send('File saved successfully.');
  });
});

app.use(express.static(path.join(__dirname, '..', 'public')));


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'start-screen.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'start-screen.html'));
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
