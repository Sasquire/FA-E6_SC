const request = require('request');
const Promise = require('promise');
const fs = require('fs');
const { exec } = require('child_process');


const artistName = "patto";
const faURL = "http://faexport.boothale.net/user/"+artistName+"/gallery.json?full=1&page=";
const e6URL = "https://e621.net/post/index.json?limit=500&tags="+artistName+"&page=";

const apiWait = 1000;
const imgWait = 333;

const iqdbPath = './iqdb';

const e6FilePath = './e6Images/';
const faFilePath = './faImages/';

start();
function start(){
	const e6MapFunction = (p) => ({
		filename: e6FilePath + p.id,
		url: p.tags.includes('alpha_channel') ? p.file_url : p.preview_url // If alpha channel take full
	});
	const faMapFunction = (p) => ({
		filename: faFilePath + p.id,
		url: p.thumbnail
	});
	deleteFolderRecursive(e6FilePath);
	deleteFolderRecursive(faFilePath);

	fs.mkdirSync(e6FilePath);
	fs.mkdirSync(faFilePath);
	downloadAndSave(e6URL, e6MapFunction, true, bothComplete);
	downloadAndSave(faURL, faMapFunction, false, bothComplete);	
	
	let numCompleted = 0;
	function bothComplete(){
		if(++numCompleted == 2){
			var justPosts = fs.readdirSync(faFilePath);
			var files = justPosts.map((p)=>(faFilePath+p));
			let allHTMLtags = [];
			let numQueried = 0;
			for(let i in files){
				let currentFile = files[i];
				if(currentFile == './faImages/.DS_Store'){ continue; }
				queryDatabase(artistName+'.db', currentFile, justPosts[i], function(data){
					outputMatch(data);
					allHTMLtags.push(convertToHTML(data));
					if(++numQueried == files.length-1){
						makeHTMLPage(allHTMLtags);
					}
				});
			}
		}
	}
}

function deleteFolderRecursive(path) {
	if (fs.existsSync(path)) {
	  	fs.readdirSync(path).forEach(function(file, index){
			var curPath = path + "/" + file;
			if (fs.lstatSync(curPath).isDirectory()) { // recurse
		  		deleteFolderRecursive(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
};

function makeHTMLPage(imageTagArray){
	let finalString = '';
	finalString += '<html>'+
					 '<head>'+
					   '<title>[FA-E6 SC] '+artistName+'</title>'+
					   '<style>'+
						 'body { display: flex; flex-wrap: wrap; flex-flow: row wrap; justify-content: space-between; background-color: #012E57}'+
						 '.max200 { max-width: 150px; max-height: 150px; margin-right:1px; margin-left:1px; }'+
						 '.noMatch   { order: 1; display: inline-table; background-color: red; border: 7px solid red; }'+
						 '.badMatch  { order: 2; display: inline-table; background-color: orange; border: 7px solid orange; }'+
						 '.goodMatch { order: 3; display: inline-table; background-color: yellow; border: 7px solid yellow; }'+
						 '.sureMatch { order: 4; display: inline-table; background-color: green; border: 7px solid green; }'+
					     '.imgCompare { width:304px; height:150px; margin:5px; }'+
					   '</style>'+
					 '</head>'+
					 '<body>'+
					   imageTagArray.join('')+
					 '</body>'+
				   '<html>';

	fs.writeFile('compare.html', finalString, function(err) {
		if(err) { return console.log(err); }
	}); 
}

function convertToHTML(data){
	let closeness = parseFloat(data[1])
	if(closeness > 90){
		closeness = 'sureMatch'
	} else if(closeness > 80){
		closeness = 'goodMatch'
	} else if(closeness > 60){
		closeness = 'badMatch'
	} else {
		closeness = 'noMatch'
	}
	const e6Id = parseInt(data[0], 10)
	const faId = data[2];
	const e6Post = 'https://e621.net/post/show/'+e6Id;
	const faPost = 'https://www.furaffinity.net/view/'+faId
	return '<span class="imgCompare '+closeness+'">'+
		     '<a href="'+e6Post+'"><img class="max200" src="'+e6FilePath+e6Id+'"/></a>'+
			 '<a href="'+faPost+'"><img class="max200" src="'+faFilePath+faId+'"/></a>'+
		   '</span>';
}

function outputMatch(data){
	let closeness = parseFloat(data[1])
	let returnString = '';

	if(closeness > 95){
		returnString = 'Post Match\t';
	} else if(closeness > 75){
		returnString = 'Post Probable\t';
	} else {
		returnString = 'Post Best\t';
	}
	returnString += 'e6-'+ data[0] + ' to fa-'+data[2] ;
	console.log(returnString);
}

let currentProscess = 0;
const maxProcess = 40;
function queryDatabase(dbName, imagePath, faPost, callback){
	tryToRun();
	function tryToRun() {
		if(currentProscess < maxProcess){
			a();
		} else {
			setTimeout(tryToRun, 500);
		}
	}
	
	function a(){
		currentProscess++;
		exec(iqdbPath+' query '+dbName+' '+imagePath, function(err, stdout, stderr){
			if (err) { console.log(err); console.log(stderr); return; }
			let returnArray = stdout.split('\n')[0].split(' ');
			returnArray[2] = faPost;
			currentProscess--;
			callback(returnArray);
		});
	}
}

function downloadAndSave(url, mapFunction, e6images, callback){
	download_JSON_Array(url, apiWait, function(posts){
		let simplePosts = posts.map(mapFunction);
		if(!e6images){
			downloadSaveArray(simplePosts, imgWait, callback);
		} else {
			downloadSaveArray(simplePosts, imgWait, function(){
				saveE62toIQDB(posts, callback);
			});
		}
	});
}

function saveE62toIQDB(imageJSON, callback){
	let finalString = [];
	for(let i in imageJSON){
		let currentImg = imageJSON[i];
		let currentEntry = currentImg.id + ':' + e6FilePath + currentImg.id;
		finalString.push(currentEntry);
	}
	finalString = finalString.join('\n');
	
	fs.writeFile('dataBaseEntries.txt', finalString, function(err) {
		if(err) { return console.log(err); }
		console.log('Saved database');
		exec('cat dataBaseEntries.txt | '+iqdbPath+' add ' + artistName+'.db', function(err, stdout, stderr){
			if (err) { console.log(err); console.log(stderr); return; }
			exec('rm dataBaseEntries.txt', function(err, stdout, stderr){
				if (err) { console.log(err); console.log(stderr); return; }
				callback();
			});
		});
	}); 
}

function download_JSON_Array(url, waitTime, callback){
	let options = {headers: { 'User-Agent': 'Artist compare v0.1 (created by idem)' }};
	let site = url.split('/')[2];
	let returnArray = [];
	let pageCounter = 0;

	download();

	function download(){
		options.url = url + ++pageCounter;
		request(options, function(requestError, headers, response){
			if (requestError || headers.statusCode != 200) { clearInterval(interval); return; } // oh shit line
			console.log('p' + pageCounter + '\tDownloaded '+site);

			let jsonObj = JSON.parse(response);
			Array.prototype.push.apply(returnArray, jsonObj); // add to array

			if(jsonObj.length != 0){
				setTimeout(download, waitTime);
			} else {
				callback(returnArray);
			}
		});
	}
}

function downloadSaveArray(infoArray, waitTime, callback){
	downloadRepeater();

	function downloadRepeater(){
		let currentLink = infoArray.pop();
		if(!currentLink){ callback(); return; }
		let url = currentLink.url;
		let filename = currentLink.filename;
		save(url, filename).then(function(){
			console.log('saved '+url+' to '+filename);
			setTimeout(downloadRepeater, waitTime)
		});
	}

	function save(uri, filename){
		return new Promise(function (resolve, reject) {
			request(uri).pipe(fs.createWriteStream(filename)).on('close', resolve);
		});
	}
}