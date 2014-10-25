var apiKey = 'YBPYIRQITXEVUBCAZ';

function getMetadata(trackTitle, trackArtist){

}

function getTrackData(trackURL,callbackFunc){
	var context;
	var trackBuffer;
    var contextFunction = window.webkitAudioContext || window.AudioContext;
	var trackID = 'TRCYWPQ139279B3308';
	var remixed;
    if (contextFunction === undefined) {
        $("#info").text("Sorry, this app needs advanced web audio. Your browser doesn't"
            + " support it. Try the latest version of Chrome?");
    } else {
		var context = new contextFunction();
		
        var request = new XMLHttpRequest();
        request.open('GET', trackURL, true);
        request.responseType = 'arraybuffer';

        request.onload = function() {
        context.decodeAudioData(request.response, function(buffer) {
            trackBuffer = buffer;
        });
        }
		request.send();
		
		remixer = createJRemixer(context, $, apiKey);
        player = remixer.getPlayer();
		
		remixer.remixTrackById(trackID, trackURL, function(t, percent) {
            track = t;
			console.log(track.status);
			
            if (track.status == 'ok') {
				callbackFunc(track);
            }
        });
    }
}

function playTrack(trackURL,callbackFunc){
	var context;
	var trackBuffer;
    var contextFunction = window.webkitAudioContext || window.AudioContext;
	var remixed;
	var trackID = 'TRCYWPQ139279B3308';
    if (contextFunction === undefined) {
        $("#info").text("Sorry, this app needs advanced web audio. Your browser doesn't"
            + " support it. Try the latest version of Chrome?");
    } else {
		var context = new contextFunction();
		
        var request = new XMLHttpRequest();
        request.open('GET', trackURL, true);
        request.responseType = 'arraybuffer';

        request.onload = function() {
        context.decodeAudioData(request.response, function(buffer) {
            trackBuffer = buffer;
        });
        }
		request.send();
		
		remixer = createJRemixer(context, $, apiKey);
        remixer.remixTrackById(trackID, trackURL, function(t, percent) {
            track = t;
			
            if (track.status == 'ok') {
                remixed = track.analysis.beats;
				player.play(0, remixed);
				callbackFunc();
            }
        });
		
    }
}