const express = require('express');
const {spawnSync} = require('child_process');
const path = require('path');

const app = express();
const port = process.env.DASHBOARD_PORT || 7069;

const dldScriptPath = '/shitflix/scripts/dld.sh';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/download-torrent', (req, res) => {
    let downloadLink = req.query.link;
    let movieName = req.query.name;
    let saveDir = req.query.saveDir || '/downloads/movies'; // Use provided dir or default

    console.log('Download link:', downloadLink);
    console.log('Save directory:', saveDir);

    let downloadScript = spawnSync('transmission-remote', ['-w', saveDir, '-a', downloadLink], {encoding: 'utf8'})
    console.log(downloadScript.stdout)
    console.log(downloadScript.stderr)
    if (downloadScript.stderr) {
        res.send('❌ Error downloading ' + movieName)
    } else {
        res.send('✅ Download of ' + movieName + ' started successfully to ' + saveDir);
    }
})

app.get('/get-search-results', (req, res) => {
    // Replace spaces with dots for torrent search compatibility
    const movie = (req.query.movie ?? '').replace(/\s+/g, '.')
    const extra = (req.query.extra ?? '').replace(/\s+/g, '.')

    // Use array form to properly handle special characters
    let cmdArray = ['-q', movie];
    if (extra) {
        cmdArray.push('-Q', extra);
    }

    let dldScript = spawnSync(dldScriptPath, cmdArray, {
        encoding: 'utf8'
    })

    console.log('Command:', dldScriptPath, cmdArray)
    let responseText = dldScript.stdout

    console.log(responseText)

    try {
        const results = JSON.parse(responseText);

        if (!results || results.length === 0) {
            res.send('<div class="no-results">No results found. Try different search terms.</div>');
            return;
        }

        let tableHtml = `
            <div class="results-header">
                Found <span class="results-count">${results.length}</span> result${results.length !== 1 ? 's' : ''}
            </div>
            <table class="results-table">
                <thead>
                    <tr>
                        <th>📥</th>
                        <th>Name</th>
                        <th>Size</th>
                        <th>Seeders</th>
                        <th>Category</th>
                        <th>IMDB</th>                        
                    </tr>
                </thead>
                <tbody>
        `;

        results.forEach(item => {
            const imdbLink = item.imdb ? `<a href="https://www.imdb.com/title/${item.imdb}" target="_blank" class="imdb-link">IMDb</a>` : '-';

            tableHtml += `
        <tr>
            <td>
                <button class="download-btn"
                        data-name="${encodeURIComponent(item.name)}"
                        data-link="${encodeURIComponent(item.download_link)}">
                    📥
                </button>
            </td>
            <td class="movie-name" title="${item.name}">${item.name}</td>
            <td class="size">${item.sizeInGb ? item.sizeInGb.toFixed(2) + ' GB' : '-'}</td>
            <td class="seeders">${item.seeders || 0}</td>
            <td><span class="category">${item.category || '-'}</span></td>
            <td>${imdbLink}</td>            
        </tr>`;
        });

        tableHtml += `
                </tbody>
            </table>
        `;

        res.send(tableHtml);
    } catch (error) {
        console.error('Error parsing response:', error);
        res.send('<div class="no-results">Error processing results. Please try again.</div>');
    }
});

const fs = require('fs').promises;

app.get('/get-wishlist', async (req, res) => {
    try {
        const wishlistPath = '/shitflix/scripts/txts/wishlist.txt';
        const content = await fs.readFile(wishlistPath, 'utf8');

        // Parse the wishlist file
        const lines = content.trim().split('\n');
        const wishlistItems = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 4) {
                return {
                    type: parts[0],
                    name: parts[1],
                    quality: parts[2],
                    dateAdded: parts[3]
                };
            }
            return null;
        }).filter(item => item !== null);

        res.json(wishlistItems);
    } catch (error) {
        console.error('Error reading wishlist:', error);
        res.status(500).json([]);
    }
});

app.post('/delete-wishlist-item', async (req, res) => {
    try {
        const { index } = req.body;
        const wishlistPath = '/shitflix/scripts/txts/wishlist.txt';

        // Read the current wishlist
        const content = await fs.readFile(wishlistPath, 'utf8');
        const lines = content.trim().split('\n');

        // Validate index
        if (index < 0 || index >= lines.length) {
            return res.status(400).json({ success: false, message: 'Invalid index' });
        }

        // Remove the line at the specified index
        lines.splice(index, 1);

        // Write back to file
        await fs.writeFile(wishlistPath, lines.join('\n') + '\n', 'utf8');

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting wishlist item:', error);
        res.status(500).json({ success: false, message: 'Failed to delete item' });
    }
});

app.post('/add-wishlist-item', async (req, res) => {
    try {
        const { type, name, quality } = req.body;
        const wishlistPath = '/shitflix/scripts/txts/wishlist.txt';

        // Validate input
        if (!type || !name || !quality) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Read current wishlist to check for duplicates
        const content = await fs.readFile(wishlistPath, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        // Check if item already exists (same type and name)
        const isDuplicate = lines.some(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
                return parts[0] === type && parts[1] === name;
            }
            return false;
        });

        if (isDuplicate) {
            return res.status(400).json({
                success: false,
                message: 'Item already exists in wishlist'
            });
        }

        // Get current date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // Create the new line
        const newLine = `${type}  ${name}  ${quality}  ${today}\n`;

        // Append to file
        await fs.appendFile(wishlistPath, newLine, 'utf8');

        res.json({ success: true });
    } catch (error) {
        console.error('Error adding wishlist item:', error);
        res.status(500).json({ success: false, message: 'Failed to add item' });
    }
});

// Replace the existing /run-sync endpoint with this SSE version
app.get('/run-sync-stream', (req, res) => {
    // Set up SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    let process = null;

    try {
        const scriptPath = '/shitflix/scripts/shitflix-runner.sh';
        const { spawn } = require('child_process');

        // Use spawn instead of spawnSync for real-time output
        const process = spawn(scriptPath, [], {
            encoding: 'utf8',
            detached: false
        });

        // Send stdout data as it arrives
        process.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter(line => line);
            lines.forEach(line => {
                res.write(`data: ${JSON.stringify({ type: 'log', content: line })}\n\n`);
            });
        });

        // Send stderr data as it arrives
        process.stderr.on('data', (data) => {
            const lines = data.toString().split('\n').filter(line => line);
            lines.forEach(line => {
                res.write(`data: ${JSON.stringify({ type: 'error', content: line })}\n\n`);
            });
        });

        // Handle process completion
        process.on('close', (code) => {
            res.write(`data: ${JSON.stringify({ type: 'complete', exitCode: code })}\n\n`);
            res.end();
        });

        // Handle process errors
        process.on('error', (error) => {
            res.write(`data: ${JSON.stringify({ type: 'error', content: `Process error: ${error.message}` })}\n\n`);
            res.end();
        });

        const cleanup = () => {
            if (process && !process.killed) {
                process.kill('SIGTERM');
                setTimeout(() => {
                    if (!process.killed) {
                        process.kill('SIGKILL');
                    }
                }, 1000);
            }
        };

        req.on('close', cleanup);
        req.on('error', cleanup);
        res.on('close', cleanup);
        res.on('error', cleanup);

    } catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', content: `Error: ${error.message}` })}\n\n`);
        res.end();
    }
});

app.get('/get-banlist', async (req, res) => {
    try {
        const banlistPath = '/shitflix/scripts/txts/banlist.txt';
        const content = await fs.readFile(banlistPath, 'utf8');

        // Parse the banlist file
        const lines = content.trim().split('\n');
        const banlistItems = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 4) {
                return {
                    type: parts[0],
                    name: parts[1],
                    quality: parts[2],
                    dateAdded: parts[3]
                };
            }
            return null;
        }).filter(item => item !== null);

        res.json(banlistItems);
    } catch (error) {
        console.error('Error reading banlist:', error);
        res.status(500).json([]);
    }
});

app.post('/delete-banlist-item', async (req, res) => {
    try {
        const { index } = req.body;
        const banlistPath = '/shitflix/scripts/txts/banlist.txt';

        // Read the current banlist
        const content = await fs.readFile(banlistPath, 'utf8');
        const lines = content.trim().split('\n');

        // Validate index
        if (index < 0 || index >= lines.length) {
            return res.status(400).json({ success: false, message: 'Invalid index' });
        }

        // Remove the line at the specified index
        lines.splice(index, 1);

        // Write back to file
        await fs.writeFile(banlistPath, lines.join('\n') + '\n', 'utf8');

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting banlist item:', error);
        res.status(500).json({ success: false, message: 'Failed to delete item' });
    }
});

app.post('/add-banlist-item', async (req, res) => {
    try {
        const { type, name, quality } = req.body;
        const banlistPath = '/shitflix/scripts/txts/banlist.txt';

        // Validate input
        if (!type || !name || !quality) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Read current banlist to check for duplicates
        const content = await fs.readFile(banlistPath, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        // Check if item already exists (same type and name)
        const isDuplicate = lines.some(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
                return parts[0] === type && parts[1] === name;
            }
            return false;
        });

        if (isDuplicate) {
            return res.status(400).json({
                success: false,
                message: 'Item already exists in banlist'
            });
        }

        // Get current date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // Create the new line
        const newLine = `${type}  ${name}  ${quality}  ${today}\n`;

        // Append to file
        await fs.appendFile(banlistPath, newLine, 'utf8');

        res.json({ success: true });
    } catch (error) {
        console.error('Error adding banlist item:', error);
        res.status(500).json({ success: false, message: 'Failed to add item' });
    }
});



app.listen(port);
console.log(`Dashboard started at http://${process.env.HOSTNAME || 'localhost'}:${port}`);