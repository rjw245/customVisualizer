
// Remix with any track.
// To build your own back-end, take a look at remix-server:  
var apiKey = 'SWHCFHJA2PPHKX7A5';
var trackID;
var trackURL;

var remixer;
var player;
var track;
var remixed;

var theCodeMirror;
var wavesurfer;
var remixedWaveSurfer;
var fs;

function beginRemix() {
    $("#info").text("Remixing...");
    var theCode = theCodeMirror.getValue();

    try {
        eval(theCode);
    } catch(e) {
      var err = new Error();
      err.message = 'Error in remix code: ' + e.message;
      $("#info").text(err.message );
      throw err;
    }
    
    remixedWavesurfer.loadBuffer(remixed);
    // Only use the filesystem if we have access to it..
    if (fs) {
        remixer.saveRemixLocally(fs, remixed, function(saveURL) {
            $('#downloadButton').html('<a href="' + saveURL + '" target="_blank">Download Remix</a>')
        });
    }

    $('.btn-remixed').removeAttr('disabled');
    $("#info").text("Remix complete!");
}


// Get an estimation of analysis time
function fetchQinfo() {
    var url = 'http://remix.echonest.com/Uploader/qinfo?callback=?'
    $.getJSON(url, {}, function(data) {
        $("#info").text("Estimated analysis time: " + Math.floor(data.estimated_wait * 1.2) + " seconds.");
    });
}

// Get the analysis, if it is ready
function analyzeAudio(audio, tag, callback) {
    var url = 'http://remix.echonest.com/Uploader/qanalyze?callback=?'
    $.getJSON(url, { url:audio, api_key:apiKey, tag:tag}, function(data) {
        if (data.status === 'done' || data.status === 'error') {
            callback(data);
        } else {
            $("#info").text(data.status + ' - ready in about ' + data.estimated_wait + ' secs. ');
            setTimeout(function() { analyzeAudio(audio, tag, callback); }, 8000);
        } 
    });
}


function init() {
    var contextFunction = window.webkitAudioContext || window.AudioContext;
    if (contextFunction === undefined) {
        $("#info").text("Sorry, this app needs advanced web audio. Your browser doesn't"
            + " support it. Try the latest version of Chrome?");
    }
    // Read the URL query string to decide what to do
    var params = {};
    var q = document.URL.split('?')[1];
    if(q != undefined){
        q = q.split('&');
        for(var i = 0; i < q.length; i++){
            var pv = q[i].split('=');
            var p = pv[0];
            var v = pv[1];
            params[p] = v;
        }
    }

    if ('key' in params) {
        // We just uploaded a track.
        // We need to log the trackID and the URL, and then redirect.
        $("#select-track").hide();
        $("#info").text("Analyzing audio...");
        trackURL = 'http://' + params['bucket'] + '/' + urldecode(params['key']);

        analyzeAudio(trackURL, 'tag', function(data) {
            if (data.status === 'done') {
                var newUrl = location.protocol + "//" +  location.host + location.pathname + "?trid=" + data.trid;
                location.href = newUrl;
            }
        });
    } 

    else if ('trid' in params) {
        // We were passed a trackID directly in the url
        // We can remix the track we get back!
        trackID = params['trid'];
        $("#play-remix").show();
        $("#select-track").hide();

        var urlXHR = getProfile(trackID, function(data) {
            trackURL = data.url;

            if (data.status == true) {
				$("#startbutton").prop("disabled",true);
                console.log("Loading...");
                var context = new contextFunction();
                
                // Only use the filesystem if we have access to it.
                if (window.File && window.FileReader && window.FileList && window.Blob && window.webkitRequestFileSystem) {
                    window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
                    window.requestFileSystem(window.TEMPORARY, 1024*1024, function(filesystem) {
                        fs = filesystem;
                    }, fileErrorHandler);
                }

                remixer = createJRemixer(context, $, apiKey);
                player = remixer.getPlayer();

                $("#info").text("Loading...");
                remixer.remixTrackById(trackID, trackURL, function(t, percent) {
                    track = t;

                    $("#info").text(percent + "% of the track loaded...");
                    if (percent == 100) {
                        $("#info").text(percent + "% of the track loaded, preparing...");
                    }

                    if (track.status == 'ok') {
                        $("#info").text("Ready to start visualizer!");
						$("#startbutton").prop("disabled",false);
                    }
                    else if (track.status == 'error' ) {
                        $("#info").text("Error getting the track URL - please try again, or re-upload the file.");
                    }

                });
            }
            else {
                console.log("Track id error.");
                $("#play-remix").hide();
                $("#select-track").show();
                $("#info").text("Error getting the track URL - please try again, or re-upload the file.");
                $("#redirect-url").attr('value', document.URL);

                $("#file").change( 
                    function() {
                        fetchQinfo();
                        var filename = $("#file").val();
                        if (endsWith(filename.toLowerCase(), ".mp3")) {
                            $("#f-filename").attr('value', fixFileName(filename));
                            $("#upload").removeAttr('disabled');
                        } else {
                            alert('Sorry, this app only supports MP3s');
                            $("#upload").attr('disabled', 'disabled');
                        }
                    }
                );
                fetchSignature();
            }
        });
    } else {
        // We're waiting for the user to pick a track and upload it
        $("#play-remix").hide();
        $("#redirect-url").attr('value', document.URL);

        $("#file").change( 
            function() {
                var filename = $("#file").val();
                if (endsWith(filename.toLowerCase(), ".mp3")) {
                    $("#f-filename").attr('value', fixFileName(filename));
                    $("#upload").removeAttr('disabled');
                } else {
                    alert('Sorry, this app only supports MP3s');
                    $("#upload").attr('disabled', 'disabled');
                }
            }
        );
        fetchSignature();
        fetchQinfo();
    }
}

window.onload = init;

function initVisualizer(beats){
	$("#info").text("Visualizing");
	console.log("Starting visualizer, passing it song beats");
	player.play(0,beats);
	console.log(beats);
	startTimes = [];
	durations  = [];
	startAmps  = [];
	endAmps    = [];
	for (var i = 0; i < beats.length; i++){
		durations.push(beats[i].duration);
		startAmps.push(beats[i].overlappingSegments[0].loudness_max);
		if(i < beats.length-1){
			endAmps.push(beats[i+1].overlappingSegments[0].loudness_max);
		} else {
			endAmps.push(0);
		}
		startTimes.push(beats[i].start);
		
		// beatFormatted = {
		// 	'start': beatStartTime,
		// 	'dur': duration,
		// 	'startAmp': startAmp,
		// 	'endAmp': endAmp
		// }
		
		// beatsFormatted.push(beatFormatted)
	}
	newBeats(durations,startAmps);
   startVisualizer();
	
}

// ///////////
if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

            var SCREEN_WIDTH = window.innerWidth,
                SCREEN_HEIGHT = window.innerHeight,

            r = 450,

            mouseX = 0, mouseY = 0,

            windowHalfX = window.innerWidth / 2,
            windowHalfY = window.innerHeight / 2,

            camera, scene, renderer;

            // startVisualizer();
            
            function startVisualizer() {
                
                var container;

                container = document.createElement( 'div' );
                document.body.appendChild( container );

                camera = new THREE.PerspectiveCamera( 80, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 3000 );
                camera.position.z = 1000;

                scene = new THREE.Scene();

                var i, line, vertex1, vertex2, material, p,
                    parameters = [ [ 0.25, 0xff7700, 1, 2 ], [ 0.5, 0xff9900, 1, 1 ], [ 0.75, 0xffaa00, 0.75, 1 ], [ 1, 0xffaa00, 0.5, 1 ], [ 1.25, 0x000833, 0.8, 1 ],
                                   [ 3.0, 0xaaaaaa, 0.75, 2 ], [ 3.5, 0xffffff, 0.5, 1 ], [ 4.5, 0xffffff, 0.25, 1 ], [ 5.5, 0xffffff, 0.125, 1 ] ],

                    geometry = new THREE.Geometry();


                for ( i = 0; i < 1500; i ++ ) {

                    var vertex1 = new THREE.Vector3();
                    vertex1.x = Math.random() * 2 - 1;
                    vertex1.y = Math.random() * 2 - 1;
                    vertex1.z = Math.random() * 2 - 1;
                    vertex1.normalize();
                    vertex1.multiplyScalar( r );

                    vertex2 = vertex1.clone();
                    vertex2.multiplyScalar( Math.random() * 0.09 + 1 );

                    geometry.vertices.push( vertex1 );
                    geometry.vertices.push( vertex2 );

                }

                for( i = 0; i < parameters.length; ++ i ) {

                    p = parameters[ i ];

                    material = new THREE.LineBasicMaterial( { color: p[ 1 ], opacity: p[ 2 ], linewidth: p[ 3 ] } );

                    line = new THREE.Line( geometry, material, THREE.LinePieces );
                    line.scale.x = line.scale.y = line.scale.z = p[ 0 ];
                    line.originalScale = p[ 0 ];
                    line.rotation.y = Math.random() * Math.PI;
                    line.updateMatrix();
                    scene.add( line );

                }

                renderer = new THREE.WebGLRenderer( { antialias: true } );
                renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
                container.appendChild( renderer.domElement );

                document.addEventListener( 'mousemove', onDocumentMouseMove, false );
                document.addEventListener( 'touchstart', onDocumentTouchStart, false );
                document.addEventListener( 'touchmove', onDocumentTouchMove, false );

                //

                window.addEventListener( 'resize', onWindowResize, false );
                animate();

            }

            function onWindowResize() {

                windowHalfX = window.innerWidth / 2;
                windowHalfY = window.innerHeight / 2;

                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();

                renderer.setSize( window.innerWidth, window.innerHeight );

            }

            function onDocumentMouseMove( event ) {

                mouseX = event.clientX - windowHalfX;
                mouseY = event.clientY - windowHalfY;

            }

            function onDocumentTouchStart( event ) {

                if ( event.touches.length > 1 ) {

                    event.preventDefault();

                    mouseX = event.touches[ 0 ].pageX - windowHalfX;
                    mouseY = event.touches[ 0 ].pageY - windowHalfY;

                }

            }

            function onDocumentTouchMove( event ) {

                if ( event.touches.length == 1 ) {

                    event.preventDefault();

                    mouseX = event.touches[ 0 ].pageX - windowHalfX;
                    mouseY = event.touches[ 0 ].pageY - windowHalfY;

                }

            }

            //
            var index = 0; 
             var beatDur = new Array();
            var sAmps = new Array();
            var t = 0;
            function animate() {

                requestAnimationFrame( animate );

                // BEAT ARRY  

                    render();

    
                if (t >= 60*beatDur[index]){

                    t=0;
					index++;
                }


            }

           
            function newBeats(durations,startAmps){

                beatDur = durations;
                sAmps = startAmps;
                console.log(beatDur);
                console.log(startAmps);


            }
			
			var rotation = 0;
			
			var volatility = 0.9;
			
			var rotInc = 0.005;
			function setParam(id,val){
				console.log("Param set");
				volatility = $("#volatility").val()/5;
				rotInc = $("#rotspeed").val()/1000;
				console.log(id);
			}
			
            function render() {
                
                t++;
                camera.position.y += ( - mouseY + 250 - camera.position.y ) * .5;
                camera.lookAt( scene.position );

                renderer.render( scene, camera );

                rotation = rotation + rotInc;

                // console.log(time);
                for ( var i = 0; i < scene.children.length; i ++ ) {

                    var object = scene.children[ i ];

                    if ( object instanceof THREE.Line ) {

                        object.rotation.y = rotation * ( i < 4 ? ( i + 1 ) : - ( i + 1 ) );

                        if ( i < 5 ) object.scale.x = object.scale.y = object.scale.z = object.originalScale * volatility *(i/5+1) *
							(1 + 0.5 * Math.sin(2*3.14*t/(60*beatDur[index]))*(-.05*sAmps[index]+.2));

                    }

                }

            }
