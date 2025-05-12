// Audio system initialization
function initAudioSystem() {
    // Create debug info first
    console.log("Initializing audio system");

    // Available tracks
    const tracks = [
        {
            name: "Main Theme",
            path: "static/assets/music/home.mp3"
        },
        {
            name: "Space Exploration",
            path: "static/assets/music/track01.mp3"
        }
    ];

    console.log("Audio tracks defined:", tracks);

    // Audio elements and state
    let currentTrackIndex = 0;
    let audio = new Audio();
    let isPlaying = false;
    let isMuted = false;
    let volume = 0.7; // Default volume (70%)

    // Save audio preferences to localStorage
    function saveAudioPreferences() {
        localStorage.setItem('massGravity_volume', volume);
        localStorage.setItem('massGravity_muted', isMuted);
        localStorage.setItem('massGravity_lastTrack', currentTrackIndex);
    }

    // Load audio preferences from localStorage
    function loadAudioPreferences() {
        const savedVolume = localStorage.getItem('massGravity_volume');
        const savedMuted = localStorage.getItem('massGravity_muted');
        const savedTrack = localStorage.getItem('massGravity_lastTrack');

        if (savedVolume !== null) {
            volume = parseFloat(savedVolume);
            document.getElementById('volume-slider').value = volume * 100;
        }

        if (savedMuted !== null) {
            isMuted = savedMuted === 'true';
            updateMuteButton();
        }

        if (savedTrack !== null) {
            currentTrackIndex = parseInt(savedTrack);
            if (currentTrackIndex >= tracks.length) {
                currentTrackIndex = 0;
            }
        }
    }

    // Load track and start playing
    function loadAndPlayTrack(index) {
        currentTrackIndex = index;

        // Create a new Audio element instead of reusing the old one
        // This helps avoid browser autoplay restrictions
        audio = new Audio(tracks[index].path);
        audio.volume = isMuted ? 0 : volume;

        // Update track name display
        document.getElementById('track-name').textContent = tracks[index].name;

        // Set up ended event to play next track
        audio.onended = function() {
            playNextTrack();
        };

        // Start playing with a deliberate user interaction context
        console.log("Attempting to play track:", tracks[index].name);

        // Force a small delay to ensure the audio element is properly initialized
        setTimeout(() => {
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log("Audio playback started successfully");
                        isPlaying = true;
                        updatePlayButton();
                        saveAudioPreferences();
                    })
                    .catch(error => {
                        console.error("Error playing audio:", error);
                        isPlaying = false;
                        updatePlayButton();

                        // Show a notification about the autoplay issue
                        if (error.name === "NotAllowedError") {
                            showNotification("Autoplay blocked: Click play to start music", "error");
                        }
                    });
            }
        }, 100);
    }

    // Play/pause toggle
    function togglePlayPause() {
        console.log("Toggle play/pause, current state:", isPlaying);

        if (isPlaying) {
            console.log("Pausing audio");
            audio.pause();
            isPlaying = false;
        } else {
            console.log("Attempting to play audio");
            if (audio.src) {
                const playPromise = audio.play();

                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log("Play resumed successfully");
                            isPlaying = true;
                        })
                        .catch(error => {
                            console.error("Error playing audio:", error);
                            // If there was a network error or the src is invalid, reload the track
                            if (error.name !== "NotAllowedError") {
                                loadAndPlayTrack(currentTrackIndex);
                                return;
                            }
                            isPlaying = false;
                        });
                }
            } else {
                console.log("No audio source, loading track");
                loadAndPlayTrack(currentTrackIndex);
            }
        }
        updatePlayButton();
    }

    // Play next track
    function playNextTrack() {
        currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
        loadAndPlayTrack(currentTrackIndex);
    }

    // Toggle mute
    function toggleMute() {
        isMuted = !isMuted;
        audio.volume = isMuted ? 0 : volume;
        updateMuteButton();
        saveAudioPreferences();
    }

    // Set volume
    function setVolume(value) {
        volume = value / 100;
        if (!isMuted) {
            audio.volume = volume;
        }
        saveAudioPreferences();
    }

    // Update play/pause button UI
    function updatePlayButton() {
        const playIcon = document.getElementById('play-icon');
        if (isPlaying) {
            playIcon.className = 'fas fa-pause';
            document.getElementById('play-pause-btn').classList.add('active');
        } else {
            playIcon.className = 'fas fa-play';
            document.getElementById('play-pause-btn').classList.remove('active');
        }
    }

    // Update mute button UI
    function updateMuteButton() {
        const volumeIcon = document.getElementById('volume-icon');
        const muteBtn = document.getElementById('mute-btn');

        if (isMuted) {
            volumeIcon.className = 'fas fa-volume-mute';
            muteBtn.classList.add('muted');
        } else {
            if (volume > 0.5) {
                volumeIcon.className = 'fas fa-volume-up';
            } else if (volume > 0) {
                volumeIcon.className = 'fas fa-volume-down';
            } else {
                volumeIcon.className = 'fas fa-volume-off';
            }
            muteBtn.classList.remove('muted');
        }
    }

    // Event listeners are now setup earlier

    // Add buttons event listeners first, before autoplay attempts
    document.getElementById('play-pause-btn').addEventListener('click', function(e) {
        // Use the click event to enable audio
        e.stopPropagation();
        console.log("Play/pause button clicked");
        togglePlayPause();
    });

    document.getElementById('next-track-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        console.log("Next track button clicked");
        playNextTrack();
    });

    document.getElementById('mute-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        console.log("Mute button clicked");
        toggleMute();
    });

    const volumeSlider = document.getElementById('volume-slider');
    volumeSlider.addEventListener('input', function() {
        console.log("Volume changed to:", this.value);
        setVolume(this.value);
    });

    // Initialize with saved preferences
    loadAudioPreferences();

    console.log("Audio system initialized, will play the first track immediately");

    // Start playing the first track immediately
    loadAndPlayTrack(currentTrackIndex);

    // Make sure the track name is shown
    document.getElementById('track-name').textContent = tracks[currentTrackIndex].name;

    // Expose audio control functions to window
    window.audioControls = {
        play: function() {
            if (!isPlaying) togglePlayPause();
        },
        pause: function() {
            if (isPlaying) togglePlayPause();
        },
        next: playNextTrack,
        mute: function() {
            if (!isMuted) toggleMute();
        },
        unmute: function() {
            if (isMuted) toggleMute();
        },
        setVolume: setVolume,
        getCurrentTrack: function() {
            return tracks[currentTrackIndex]?.name || 'None';
        }
    };
}

initAudioSystem();
