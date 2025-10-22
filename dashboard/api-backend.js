const express = require('express');
const {spawnSync} = require('child_process');

const path = require('path');

const app = express();
const port = process.env.DASHBOARD_PORT || 3333;

const dldScriptPath = '/shitflix/scripts/dld.sh';

app.use(express.static(path.join(__dirname, 'public')));

// sendFile will go here
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/index.html'));
});

app.get('/download-torrent', (req, res) => {
    let downloadLink = req.query.link;
    let movieName = req.query.name;
    console.log(downloadLink);

    let downloadScript = spawnSync('transmission-remote', ['-a', downloadLink], {encoding: 'utf8'})
    console.log(downloadScript.stdout)
    console.log(downloadScript.stderr)
    if (downloadScript.stderr) {
        res.send('Error downloading ' + movieName)
    } else {
        res.send('Download of ' + movieName + ' started ... <br/>' + downloadScript.stdout);
    }
})

app.get('/get-search-results', (req, res) => {
    const movie = req.query.movie ?? ''
    const extra = req.query.extra ?? ''

    console.log(movie);
    console.log(extra);

    let dldScript = spawnSync(dldScriptPath + ' -q ' + movie + ' -Q ' + extra, {
        encoding: 'utf8',
        shell: true
    })
    console.log(dldScriptPath + ' -q ' + movie + ' -Q ' + extra)
    let responseText = dldScript.stdout

    console.log('Response =======>' + responseText)
    // const errorText = dldScript.stderr

    let responsObject = JSON.parse(responseText).map(item => {
            const hxGetDldLink = '/download-torrent?' + 'name=' + encodeURIComponent(item.name) + '&link=' + encodeURIComponent(item.download_link);
            return {
                ...item,
                "download": '<button hx-get=' + hxGetDldLink + '' +
                    ' hx-trigger=click' +
                    ' hx-swap=innerHTML' +
                    ' hx-target=#download-result-container>' +
                    'Download' +
                    '</button>'
            }
        }
    );

    res.send(JSON.stringify(responsObject, undefined, 2));

});

app.listen(port);
console.log('Dashboard started at http://localhost:' + port);