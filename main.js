const path = require('path')
const url = require('url')
const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const connectDB = require('./config/db')
const Log = require('./models/Log')
let mainWindow
let isDev = false

const isMac = process.platform === 'darwin'? true : false

if (
	process.env.NODE_ENV !== undefined &&
	process.env.NODE_ENV === 'development'
) {
	isDev = true
}

//Connect to Database
connectDB()

function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: isDev ? 1400:1100,
		height: 800,
		show: false,
		icon: './assets/icons/icon.png',
		webPreferences: {
			nodeIntegration: true,
		},
	})

	let indexPath

	if (isDev && process.argv.indexOf('--noDevServer') === -1) {
		indexPath = url.format({
			protocol: 'http:',
			host: 'localhost:8080',
			pathname: 'index.html',
			slashes: true,
		})
	} else {
		indexPath = url.format({
			protocol: 'file:',
			pathname: path.join(__dirname, 'dist', 'index.html'),
			slashes: true,
		})
	}

	mainWindow.loadURL(indexPath)

	// Don't show until we are ready and loaded
	mainWindow.once('ready-to-show', () => {
		mainWindow.show()

		// Open devtools if dev
		if (isDev) {
			const {
				default: installExtension,
				REACT_DEVELOPER_TOOLS,
			} = require('electron-devtools-installer')

			installExtension(REACT_DEVELOPER_TOOLS).catch((err) =>
				console.log('Error loading React DevTools: ', err)
			)
			mainWindow.webContents.openDevTools()
		}
	})

	mainWindow.on('closed', () => (mainWindow = null))
}

app.on('ready', () =>{
	createMainWindow() // 1st Render THING on Window
	const mainMenu=Menu.buildFromTemplate(menu) // 2nd Render THING on Window
	Menu.setApplicationMenu(mainMenu)
})

// ==================================== APP MENU BELOW  ====================================


const menu = [
	...(isMac ? [{ role: 'appMenu' }] : []),
	{
	  role: 'fileMenu',
	},
	{
	  role: 'editMenu',
	},
	{
	  label: 'Logs',
	  submenu: [
		{
		  label: 'Clear Logs',
		  click: () => clearLogs(),
		},
	  ],
	},
	...(isDev
	  ? [
		  {
			label: 'Developer',
			submenu: [
			  { role: 'reload' },
			  { role: 'forcereload' },
			  { type: 'separator' },
			  { role: 'toggledevtools' },
			],
		  },
		]
	  : []),
  ]

// ====================================  ==================================== IPC PROCESSES BELOW  ====================================  ====================================
// Helper Functions Below
// Send Logs & Clear Logs
async function sendLogs()// Function to fetch data from data base
{
	try{
		const logs = await Log.find().sort({created:1/*1=Ascending*/})
		mainWindow.webContents.send('logs:get', JSON.stringify(logs))
	}
	catch(err){
		console.log(err)
	}
}
async function clearLogs()// Function to fetch data from data base
{
	try{
		const logs = await Log.deleteMany({})
		mainWindow.webContents.send('logs:clear'/*, JSON.stringify(logs)*/) // Second Parameter Removed as nothing to render, since all logs are cleared
	}
	catch(err){
		console.log(err)
	}
}
 // ====================================
 // ====================================
// Catching the sent logs here. Sent from App.js by ipcRenderer.send('logs:load')
// Load Log
ipcMain.on('logs:load',sendLogs)
//Create Log
ipcMain.on('logs:add', async (e,item) => {
	try{
		await Log.create(item)
		sendLogs()
		//console.log('here')
	} catch(err){
		console.log(err)
	}
	//console.log(item)
})
 // ====================================
//Delete Log
ipcMain.on('logs:delete', async (e,id) => {
	try{
		await Log.findOneAndDelete({ _id:id })
		sendLogs()
		//console.log('here')
	} catch(err){
		console.log(err)
	}
	//console.log(item)
})
 // ====================================
// Clear Log
 ipcMain.on('logs:clear', async(e) => {
	 try{

	 }
	 catch(err){
		console.log(err)
	 }
 })
 // ====================================
// ====================================
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', () => {
	if (mainWindow === null) {
		createMainWindow()
	}
})

// Stop error
app.allowRendererProcessReuse = true
