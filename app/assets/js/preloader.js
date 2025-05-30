const {ipcRenderer}  = require('electron')
const fs             = require('fs-extra')
const os             = require('os')
const path           = require('path')

const ConfigManager  = require('./configmanager')
const { DistroAPI }  = require('./distromanager')
const LangLoader     = require('./langloader')
const { LoggerUtil } = require('helios-core')
// eslint-disable-next-line no-unused-vars
const { HeliosDistribution } = require('helios-core/common')
const { log } = require('console')

const logger = LoggerUtil.getLogger('Preloader')

logger.info('Loading..')

// Load ConfigManager
ConfigManager.load()

// Yuck!
// TODO Fix this
DistroAPI['commonDir'] = ConfigManager.getCommonDirectory()
DistroAPI['instanceDir'] = ConfigManager.getInstanceDirectory()

// Load Strings
LangLoader.setupLanguage()

/**
 * Removes any mods that are not present in the distribution file
 * @param {HeliosDistribution} distro The distribution object
*/
function cleanExtraMods(distro) {
    logger.info('Cleaning extra mods...')
    if(distro == null) return
    
    const selectedServer = distro.getServerById(ConfigManager.getSelectedServer())
    if(!selectedServer) return
    
    const validMods = new Set()
    
    // Get all valid mods from the distribution
    if(selectedServer.rawServer.mods) {
        selectedServer.rawServer.mods.forEach(mod => {
            validMods.add(mod.name || mod.id)
        })
    }
    
    const modsDir = path.join(
        ConfigManager.getInstanceDirectory(),
        selectedServer.rawServer.id,
        'mods'
    )
    
    // Check if mods directory exists
    if(!fs.existsSync(modsDir)) return
    
    // Create a file to track mods that couldn't be deleted for later cleanup
    const pendingDeletionsFile = path.join(
        ConfigManager.getInstanceDirectory(),
        selectedServer.rawServer.id,
        'pending_mod_deletions.json'
    )
    
    // Load any previously failed deletions
    let pendingDeletions = []
    try {
        if(fs.existsSync(pendingDeletionsFile)) {
            pendingDeletions = JSON.parse(fs.readFileSync(pendingDeletionsFile, 'utf8'))
        }
    } catch(err) {
        logger.warn('Failed to read pending deletions file', err)
    }
    
    try {
        // Use synchronous methods to ensure deletion completes
        const files = fs.readdirSync(modsDir)
        
        let modsRemoved = 0
        let modsFailed = 0
        const failedMods = []
        
        // Try to remove any previously pending deletions first
        if(pendingDeletions.length > 0) {
            logger.info(`Attempting to clean ${pendingDeletions.length} previously failed mod deletions`)
            pendingDeletions = pendingDeletions.filter(modPath => {
                try {
                    if(fs.existsSync(modPath)) {
                        fs.removeSync(modPath)
                        modsRemoved++
                        logger.info(`Successfully removed previously failed mod: ${path.basename(modPath)}`)
                        return false // Remove from pending list
                    }
                    return false // File no longer exists, remove from pending list
                } catch(err) {
                    logger.warn(`Still unable to remove mod: ${path.basename(modPath)}`, err)
                    return true // Keep in pending list
                }
            })
        }
        
        // Now process current mods
        files.forEach(file => {
            // Skip directories and non-jar files
            if(!file.endsWith('.jar')) return
            
            const modName = file.replace('.jar', '')
            if(!validMods.has(modName)) {
                const modPath = path.join(modsDir, file)
                logger.info(`Attempting to remove extra mod: ${file}`)
                
                try {
                    // Make sure file permissions are set correctly if possible
                    try {
                        const stats = fs.statSync(modPath)
                        if(!(stats.mode & 0o200)) { // Check if writable
                            fs.chmodSync(modPath, stats.mode | 0o200) // Add write permission
                        }
                    } catch(statErr) {
                        logger.warn(`Couldn't check/change file permissions: ${statErr.message}`)
                    }
                    
                    fs.removeSync(modPath)
                    modsRemoved++
                    logger.info(`Successfully removed: ${file}`)
                } catch(err) {
                    modsFailed++
                    failedMods.push(file)
                    // Add to pending deletions list
                    if(!pendingDeletions.includes(modPath)) {
                        pendingDeletions.push(modPath)
                    }
                    logger.warn(`Failed to remove extra mod ${file}`, err)
                }
            }
        })
        
        // Save any pending deletions for next launch
        if(pendingDeletions.length > 0) {
            try {
                fs.writeFileSync(pendingDeletionsFile, JSON.stringify(pendingDeletions))
                logger.info(`Saved ${pendingDeletions.length} mods for deletion on next launch`)
            } catch(err) {
                logger.warn('Failed to save pending deletions file', err)
            }
        } else if(fs.existsSync(pendingDeletionsFile)) {
            // Clean up pending deletions file if no longer needed
            try {
                fs.unlinkSync(pendingDeletionsFile)
            } catch(err) {
                logger.warn('Failed to clean up pending deletions file', err)
            }
        }
        
        logger.info(`Cleaned up ${modsRemoved} extra mods, ${modsFailed} mods will be cleaned on next launch`)
        
    } catch(err) {
        logger.warn('Error processing mods directory', err)
    }
}

/**
 * 
 * @param {HeliosDistribution} data 
 */
function onDistroLoad(data){
    if(data != null){
        
        // Resolve the selected server if its value has yet to be set.
        if(ConfigManager.getSelectedServer() == null || data.getServerById(ConfigManager.getSelectedServer()) == null){
            logger.info('Determining default selected server..')
            ConfigManager.setSelectedServer(data.getMainServer().rawServer.id)
            ConfigManager.save()
        }

        logger.info("cleaning up extra mods..")
        cleanExtraMods(data)
    }
    ipcRenderer.send('distributionIndexDone', data != null)
}

DistroAPI.clearExtraMods = function() {
    return this.getDistribution()
        .then(heliosDistro => {
            logger.info('Cleaning extra mods from external call...')
            cleanExtraMods(heliosDistro)
            return heliosDistro
        })
        .catch(err => {
            logger.error('Failed to clean extra mods', err)
            return null
        })
}

// Ensure Distribution is downloaded and cached.
DistroAPI.getDistribution()
    .then(heliosDistro => {
        logger.info('Loaded distribution index.')

        onDistroLoad(heliosDistro)
    })
    .catch(err => {
        logger.info('Failed to load an older version of the distribution index.')
        logger.info('Application cannot run.')
        logger.error(err)

        onDistroLoad(null)
    })

// Clean up temp dir incase previous launches ended unexpectedly. 
fs.remove(path.join(os.tmpdir(), ConfigManager.getTempNativeFolder()), (err) => {
    if(err){
        logger.warn('Error while cleaning natives directory', err)
    } else {
        logger.info('Cleaned natives directory.')
    }
})