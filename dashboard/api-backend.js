const express = require('express');
const {spawnSync} = require('child_process');
const path = require('path');

const app = express();
const port = process.env.DASHBOARD_PORT || 3333;

const dldScriptPath = '/shitflix/scripts/dld.sh';

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/download-torrent', (req, res) => {
    let downloadLink = req.query.link;
    let movieName = req.query.name;
    console.log(downloadLink);

    let saveDir = '/downloads/movies'

    let downloadScript = spawnSync('transmission-remote',
        ['-w', saveDir, '-a', downloadLink], {encoding: 'utf8'})
    console.log(downloadScript.stdout)
    console.log(downloadScript.stderr)
    if (downloadScript.stderr) {
        res.send('❌ Error downloading ' + movieName)
    } else {
        res.send('✅ Download of ' + movieName + ' started successfully!');
    }
})

app.get('/get-search-results', (req, res) => {
    // Replace spaces with dots for torrent search compatibility
    const movie = (req.query.movie ?? '').replace(/\s+/g, '.')
    const extra = (req.query.extra ?? '').replace(/\s+/g, '.')

    console.log('Searching for movie:', movie, 'with extra:', extra)

    // Use array form to properly handle special characters
    let dldScript = spawnSync(dldScriptPath, ['-q', movie, '-Q', extra], {
        encoding: 'utf8'
    })

    console.log('Command:', dldScriptPath, '-q', movie, '-Q', extra)
    let responseText = dldScript.stdout

    console.log('Response =======>' + responseText)

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
                        <th>Name</th>
                        <th>Size</th>
                        <th>Seeders</th>
                        <th>Category</th>
                        <th>IMDB</th>
                        <th>📥</th>
                    </tr>
                </thead>
                <tbody>
        `;

        results.forEach(item => {
            const moviesHxGetDldLink = `/download-torrent?name=${encodeURIComponent(item.name)}&link=${encodeURIComponent(item.download_link)}`;
            const imdbLink = item.imdb ? `<a href="https://www.imdb.com/title/${item.imdb}" target="_blank" class="imdb-link">IMDb</a>` : '-';

            tableHtml += `
                <tr>
                    <td class="movie-name">${item.name}</td>
                    <td class="size">${item.sizeInGb ? item.sizeInGb.toFixed(2) + ' GB' : '-'}</td>
                    <td class="seeders">${item.seeders || 0}</td>
                    <td><span class="category">${item.category || '-'}</span></td>
                    <td>${imdbLink}</td>
                    <td>
                        <button class="download-btn"
                                hx-get="${moviesHxGetDldLink}"
                                hx-trigger="click"
                                hx-swap="innerHTML"
                                hx-target="#download-result-container">
                            Download
                        </button>
                    </td>
                </tr>
            `;
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

app.listen(port);
console.log('Dashboard started at http://localhost:' + port);