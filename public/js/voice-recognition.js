/**
 * Module de reconnaissance vocale côté client
 * Gère l'enregistrement audio et l'interaction avec l'API de reconnaissance vocale
 */

// Configuration globale
const VoiceRecognition = {
  // État de l'enregistrement
  isRecording: false,
  isPaused: false,
  recorder: null,
  audioContext: null,
  audioStream: null,
  mediaRecorder: null,
  audioChunks: [],
  
  // Informations de session
  sessionId: null,
  location: null,
  period: null,
  userId: null,
  
  // Configuration
  recordingMode: 'interactif', // 'interactif' ou 'continu'
  audioFeedbackEnabled: true,
  confirmationMode: 'voice', // 'voice', 'sound', 'vibration'
  language: 'fr-FR',
  silenceDetectionEnabled: true,
  silenceThreshold: -50,  // dB
  silenceDuration: 1.5,   // secondes
  
  // Compteurs et minuteurs
  recordingDuration: 0,
  recordingTimer: null,
  silenceTimer: null,
  
  // Éléments de l'interface utilisateur
  elements: {
    recordButton: null,
    stopButton: null,
    pauseButton: null,
    resetButton: null,
    timerDisplay: null,
    statusDisplay: null,
    waveformDisplay: null,
    transcriptionDisplay: null,
    itemsContainer: null,
    locationSelect: null,
    periodInput: null,
    modeSelect: null,
    processingSpinner: null
  },
  
  // Callbacks personnalisables
  callbacks: {
    onRecordingStart: null,
    onRecordingStop: null,
    onRecordingPause: null,
    onRecordingResume: null,
    onItemRecognized: null,
    onTranscriptionUpdate: null,
    onError: null
  },
  
  /**
   * Initialise le module de reconnaissance vocale
   * @param {Object} config - Configuration
   * @returns {Promise<boolean>} - Succès de l'initialisation
   */
  async initialize(config = {}) {
    try {
      console.log('Initialisation du module de reconnaissance vocale...');
      
      // Fusionner la configuration
      if (config.recordingMode) this.recordingMode = config.recordingMode;
      if (config.audioFeedbackEnabled !== undefined) this.audioFeedbackEnabled = config.audioFeedbackEnabled;
      if (config.confirmationMode) this.confirmationMode = config.confirmationMode;
      if (config.language) this.language = config.language;
      if (config.elements) this.elements = { ...this.elements, ...config.elements };
      if (config.callbacks) this.callbacks = { ...this.callbacks, ...config.callbacks };
      if (config.userId) this.userId = config.userId;
      if (config.silenceDetectionEnabled !== undefined) this.silenceDetectionEnabled = config.silenceDetectionEnabled;
      if (config.silenceThreshold !== undefined) this.silenceThreshold = config.silenceThreshold;
      if (config.silenceDuration !== undefined) this.silenceDuration = config.silenceDuration;
      
      // Initialiser les événements UI si les éléments sont fournis
      this._initUIEvents();
      
      // Vérifier la prise en charge du navigateur
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La reconnaissance vocale n\'est pas prise en charge par ce navigateur');
      }
      
      console.log('Module de reconnaissance vocale initialisé avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du module de reconnaissance vocale:', error);
      this._notifyError(error);
      return false;
    }
  },
  
  /**
   * Initialise les gestionnaires d'événements de l'interface utilisateur
   * @private
   */
  _initUIEvents() {
    // Bouton d'enregistrement
    if (this.elements.recordButton) {
      this.elements.recordButton.addEventListener('click', () => {
        if (!this.isRecording) {
          this.startRecording();
        } else if (this.isPaused) {
          this.resumeRecording();
        } else {
          this.pauseRecording();
        }
      });
    }
    
    // Bouton d'arrêt
    if (this.elements.stopButton) {
      this.elements.stopButton.addEventListener('click', () => {
        if (this.isRecording) {
          this.stopRecording();
        }
      });
    }
    
    // Bouton de pause (si différent du bouton d'enregistrement)
    if (this.elements.pauseButton) {
      this.elements.pauseButton.addEventListener('click', () => {
        if (this.isRecording && !this.isPaused) {
          this.pauseRecording();
        } else if (this.isRecording && this.isPaused) {
          this.resumeRecording();
        }
      });
    }
    
    // Bouton de réinitialisation
    if (this.elements.resetButton) {
      this.elements.resetButton.addEventListener('click', () => {
        this.resetRecording();
      });
    }
    
    // Sélecteur d'emplacement
    if (this.elements.locationSelect) {
      this.elements.locationSelect.addEventListener('change', (e) => {
        this.location = e.target.value;
      });
      
      // Initialiser la valeur
      if (this.elements.locationSelect.value) {
        this.location = this.elements.locationSelect.value;
      }
    }
    
    // Sélecteur de période
    if (this.elements.periodInput) {
      this.elements.periodInput.addEventListener('change', (e) => {
        this.period = e.target.value;
      });
      
      // Initialiser avec le mois en cours si vide
      if (!this.elements.periodInput.value) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        this.elements.periodInput.value = `${year}-${month}`;
        this.period = `${year}-${month}`;
      } else {
        this.period = this.elements.periodInput.value;
      }
    }
    
    // Sélecteur de mode
    if (this.elements.modeSelect) {
      this.elements.modeSelect.addEventListener('change', (e) => {
        this.recordingMode = e.target.value;
      });
    }
  },
  
  /**
   * Démarre l'enregistrement audio
   * @returns {Promise<boolean>} - Succès du démarrage
   */
  async startRecording() {
    try {
      if (this.isRecording) {
        return false;
      }
      
      console.log('Démarrage de l\'enregistrement...');
      
      // Vérifier si l'emplacement est sélectionné
      if (!this.location) {
        throw new Error('Veuillez sélectionner un emplacement d\'inventaire');
      }
      
      // Vérifier si la période est spécifiée
      if (!this.period) {
        const now = new Date();
        this.period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      }
      
      // Demander l'accès au microphone
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Créer un contexte audio pour l'analyse du volume
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioSource = this.audioContext.createMediaStreamSource(this.audioStream);
      
      // Créer un analyseur pour la détection du silence
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 2048;
      audioSource.connect(analyser);
      
      // Configurer le MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.audioStream);
      this.audioChunks = [];
      
      // Événement de données disponibles
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
        
        // Si en mode interactif, envoyer le segment pour traitement
        if (this.recordingMode === 'interactif' && !this.isPaused) {
          this._processAudioSegment();
        }
      };
      
      // Démarrer l'enregistrement
      this.mediaRecorder.start(1000); // Collecter des données toutes les secondes
      this.isRecording = true;
      this.isPaused = false;
      this.recordingDuration = 0;
      
      // Démarrer le timer
      this.recordingTimer = setInterval(() => {
        this.recordingDuration++;
        this._updateTimerDisplay();
      }, 1000);
      
      // Mettre à jour l'interface utilisateur
      this._updateUIForRecording();
      
      // Commencer la détection du silence si activée
      if (this.silenceDetectionEnabled) {
        this._startSilenceDetection(analyser);
      }
      
      // Créer une session sur le serveur
      if (!this.sessionId) {
        await this._createSession();
      }
      
      // Notifier le début de l'enregistrement
      if (typeof this.callbacks.onRecordingStart === 'function') {
        this.callbacks.onRecordingStart();
      }
      
      console.log('Enregistrement démarré avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
      this._notifyError(error);
      return false;
    }
  },
  
  /**
   * Démarre la détection du silence
   * @param {AnalyserNode} analyser - Nœud d'analyse audio
   * @private
   */
  _startSilenceDetection(analyser) {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let silenceStart = null;
    
    const checkSilence = () => {
      if (!this.isRecording || this.isPaused) {
        return;
      }
      
      analyser.getByteFrequencyData(dataArray);
      
      // Calculer le volume moyen
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // Convertir en dB approximatif
      const dB = 20 * Math.log10(average / 255);
      
      // Mettre à jour l'affichage de la forme d'onde si disponible
      if (this.elements.waveformDisplay) {
        this._updateWaveformDisplay(dataArray);
      }
      
      // Vérifier si le volume est inférieur au seuil
      if (dB < this.silenceThreshold) {
        if (!silenceStart) {
          silenceStart = Date.now();
        } else if (Date.now() - silenceStart > this.silenceDuration * 1000) {
          // Silence détecté pour la durée spécifiée
          if (this.recordingMode === 'interactif') {
            console.log('Silence détecté, traitement du segment audio...');
            this._processAudioSegment();
            silenceStart = null;
          }
        }
      } else {
        silenceStart = null;
      }
      
      // Continuer la détection
      requestAnimationFrame(checkSilence);
    };
    
    // Démarrer la détection
    checkSilence();
  },
  
  /**
   * Met à jour l'affichage de la forme d'onde
   * @param {Uint8Array} dataArray - Données audio
   * @private
   */
  _updateWaveformDisplay(dataArray) {
    if (!this.elements.waveformDisplay) return;
    
    const canvas = this.elements.waveformDisplay;
    const canvasCtx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Effacer le canvas
    canvasCtx.clearRect(0, 0, width, height);
    
    // Dessiner la forme d'onde
    canvasCtx.fillStyle = '#3498db';
    canvasCtx.beginPath();
    
    const barWidth = width / dataArray.length;
    let x = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = dataArray[i] / 255 * height;
      canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
      x += barWidth;
    }
  },
  
  /**
   * Met à jour l'affichage du minuteur
   * @private
   */
  _updateTimerDisplay() {
    if (!this.elements.timerDisplay) return;
    
    const minutes = Math.floor(this.recordingDuration / 60);
    const seconds = this.recordingDuration % 60;
    
    this.elements.timerDisplay.textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  },
  
  /**
   * Met à jour l'interface utilisateur pour l'état d'enregistrement
   * @private
   */
  _updateUIForRecording() {
    if (this.elements.recordButton) {
      if (this.isPaused) {
        this.elements.recordButton.innerHTML = '<i class="fas fa-play"></i>';
        this.elements.recordButton.classList.remove('btn-danger');
        this.elements.recordButton.classList.add('btn-success');
      } else {
        this.elements.recordButton.innerHTML = '<i class="fas fa-pause"></i>';
        this.elements.recordButton.classList.remove('btn-success');
        this.elements.recordButton.classList.add('btn-danger');
      }
    }
    
    if (this.elements.stopButton) {
      this.elements.stopButton.disabled = false;
    }
    
    if (this.elements.resetButton) {
      this.elements.resetButton.disabled = false;
    }
    
    if (this.elements.statusDisplay) {
      this.elements.statusDisplay.textContent = this.isPaused 
        ? 'Enregistrement en pause' 
        : 'Enregistrement en cours...';
    }
    
    // Désactiver les sélecteurs pendant l'enregistrement
    if (this.elements.locationSelect) {
      this.elements.locationSelect.disabled = true;
    }
    
    if (this.elements.periodInput) {
      this.elements.periodInput.disabled = true;
    }
    
    if (this.elements.modeSelect) {
      this.elements.modeSelect.disabled = true;
    }
  },
  
  /**
   * Crée une session de reconnaissance vocale sur le serveur
   * @private
   * @returns {Promise<void>}
   */
  async _createSession() {
    try {
      console.log('Création d\'une session de reconnaissance vocale...');
      
      const response = await fetch('/api/voice/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: this.recordingMode,
          userId: this.userId || 'anonymous',
          location: this.location,
          period: this.period
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur de création de session: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success || !result.sessionId) {
        throw new Error(result.message || 'Échec de la création de session');
      }
      
      this.sessionId = result.sessionId;
      console.log(`Session créée avec succès: ${this.sessionId}`);
    } catch (error) {
      console.error('Erreur lors de la création de la session:', error);
      this._notifyError(error);
      throw error;
    }
  },
  
  /**
   * Traite un segment audio et l'envoie au serveur
   * @private
   * @returns {Promise<void>}
   */
  async _processAudioSegment() {
    if (this.audioChunks.length === 0) return;
    
    try {
      console.log('Traitement du segment audio...');
      
      if (this.elements.processingSpinner) {
        this.elements.processingSpinner.classList.remove('d-none');
      }
      
      // Créer un blob à partir des chunks audio
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.audioChunks = []; // Réinitialiser pour le prochain segment
      
      // Créer un formulaire pour l'envoi
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('sessionId', this.sessionId);
      
      // Envoyer l'audio au serveur pour traitement
      const response = await fetch('/api/voice/process-segment', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Erreur de traitement audio: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Échec du traitement audio');
      }
      
      console.log('Segment audio traité avec succès:', result);
      
      // Mettre à jour l'interface utilisateur avec le résultat
      this._updateUIWithRecognitionResult(result);
      
      // Traiter les commandes vocales
      if (result.command) {
        this._handleVoiceCommand(result.command);
      }
      
      // Jouer un retour audio si activé et si un élément a été reconnu
      if (this.audioFeedbackEnabled && result.item && !result.needsReview) {
        this._playAudioFeedback(result.confirmationText || 'Élément reconnu');
      }
      
      // Notifier la reconnaissance d'un élément
      if (result.item && typeof this.callbacks.onItemRecognized === 'function') {
        this.callbacks.onItemRecognized(result.item);
      }
    } catch (error) {
      console.error('Erreur lors du traitement du segment audio:', error);
      this._notifyError(error);
    } finally {
      if (this.elements.processingSpinner) {
        this.elements.processingSpinner.classList.add('d-none');
      }
    }
  },
  
  /**
   * Met à jour l'interface utilisateur avec le résultat de la reconnaissance
   * @param {Object} result - Résultat de la reconnaissance
   * @private
   */
  _updateUIWithRecognitionResult(result) {
    // Mettre à jour la transcription
    if (result.transcript && this.elements.transcriptionDisplay) {
      this.elements.transcriptionDisplay.textContent = result.transcript;
      
      // Notifier la mise à jour de la transcription
      if (typeof this.callbacks.onTranscriptionUpdate === 'function') {
        this.callbacks.onTranscriptionUpdate(result.transcript);
      }
    }
    
    // Ajouter l'élément reconnu à la liste
    if (result.item && this.elements.itemsContainer) {
      const itemElement = document.createElement('div');
      itemElement.className = 'recognized-item mb-2 p-2 border rounded';
      
      // Ajouter une classe selon le niveau de confiance
      if (result.needsReview) {
        itemElement.classList.add('border-warning', 'bg-warning-subtle');
      } else {
        itemElement.classList.add('border-success', 'bg-success-subtle');
      }
      
      // Créer le contenu de l'élément
      itemElement.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${result.item.productName || result.item.product_name || 'Produit inconnu'}</strong>
            <span class="ms-2">${result.item.quantity} ${result.item.unit}</span>
          </div>
          <div>
            ${result.needsReview 
              ? '<span class="badge bg-warning text-dark">À vérifier</span>' 
              : '<span class="badge bg-success">Confirmé</span>'}
          </div>
        </div>
        ${result.needsReview ? `<div class="small text-muted mt-1">${result.item.originalText}</div>` : ''}
        ${result.confidence ? `<div class="small">Confiance: ${Math.round(result.confidence * 100)}%</div>` : ''}
      `;
      
      // Ajouter des boutons d'action si nécessaire
      if (result.needsReview) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'mt-2 d-flex gap-2';
        
        // Bouton de confirmation
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-sm btn-success';
        confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirmer';
        confirmBtn.addEventListener('click', () => {
          this._confirmItem(result.item);
          itemElement.classList.remove('border-warning', 'bg-warning-subtle');
          itemElement.classList.add('border-success', 'bg-success-subtle');
          actionsDiv.remove();
        });
        
        // Bouton de modification
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-primary';
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Modifier';
        editBtn.addEventListener('click', () => {
          this._editItem(result.item, itemElement);
        });
        
        // Bouton de suppression
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Supprimer';
        deleteBtn.addEventListener('click', () => {
          itemElement.remove();
        });
        
        actionsDiv.appendChild(confirmBtn);
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        itemElement.appendChild(actionsDiv);
      }
      
      this.elements.itemsContainer.appendChild(itemElement);
    }
  },
  
  /**
   * Gère une commande vocale
   * @param {Object} command - Commande vocale
   * @private
   */
  _handleVoiceCommand(command) {
    console.log('Commande vocale détectée:', command);
    
    switch (command.type) {
      case 'finish':
        this.stopRecording();
        break;
      case 'cancel':
        // Annuler le dernier élément
        if (this.elements.itemsContainer && this.elements.itemsContainer.lastChild) {
          this.elements.itemsContainer.lastChild.remove();
        }
        break;
      case 'pause':
        this.pauseRecording();
        break;
      case 'resume':
        if (this.isPaused) {
          this.resumeRecording();
        }
        break;
      case 'help':
        // Afficher l'aide
        alert('Commandes vocales disponibles:\n' +
              '- "Terminer inventaire" : Arrête l\'enregistrement\n' +
              '- "Annuler" : Supprime le dernier élément\n' +
              '- "Pause" : Met l\'enregistrement en pause\n' +
              '- "Reprendre" : Reprend l\'enregistrement\n');
        break;
    }
  },
  
  /**
   * Joue un retour audio
   * @param {string} text - Texte à prononcer
   * @private
   */
  _playAudioFeedback(text) {
    if (!this.audioFeedbackEnabled) return;
    
    // Créer un élément audio pour le feedback
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.language;
    
    // Utiliser une voix féminine si disponible
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(voice => 
      voice.lang.startsWith(this.language.substring(0, 2)) && 
      voice.name.includes('Female')
    );
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    // Jouer le feedback
    window.speechSynthesis.speak(utterance);
  },
  
  /**
   * Confirme un élément
   * @param {Object} item - Élément à confirmer
   * @private
   */
  _confirmItem(item) {
    // Marquer l'élément comme confirmé
    item.needsReview = false;
    item.confirmed = true;
    
    // Envoyer la confirmation au serveur
    fetch('/api/voice/confirm-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: this.sessionId,
        item
      })
    }).catch(error => {
      console.error('Erreur lors de la confirmation de l\'élément:', error);
    });
    
    // Jouer un retour audio
    this._playAudioFeedback(`${item.quantity} ${item.unit} de ${item.productName} confirmé`);
  },
  
  /**
   * Édite un élément
   * @param {Object} item - Élément à éditer
   * @param {HTMLElement} element - Élément HTML à mettre à jour
   * @private
   */
  _editItem(item, element) {
    // Créer un formulaire d'édition simple
    const form = document.createElement('form');
    form.className = 'edit-item-form mt-2';
    
    form.innerHTML = `
      <div class="row g-2">
        <div class="col-md-6">
          <input type="text" class="form-control form-control-sm" name="productName" placeholder="Nom du produit" value="${item.productName || item.product_name || ''}">
        </div>
        <div class="col-md-3">
          <input type="number" class="form-control form-control-sm" name="quantity" placeholder="Quantité" value="${item.quantity || 0}" min="0" step="0.01">
        </div>
        <div class="col-md-3">
          <select class="form-select form-select-sm" name="unit">
            <option value="pièce" ${item.unit === 'pièce' ? 'selected' : ''}>Pièce</option>
            <option value="bouteille" ${item.unit === 'bouteille' ? 'selected' : ''}>Bouteille</option>
            <option value="cannette" ${item.unit === 'cannette' ? 'selected' : ''}>Cannette</option>
            <option value="boîte" ${item.unit === 'boîte' ? 'selected' : ''}>Boîte</option>
            <option value="kg" ${item.unit === 'kg' ? 'selected' : ''}>Kg</option>
            <option value="g" ${item.unit === 'g' ? 'selected' : ''}>g</option>
            <option value="l" ${item.unit === 'l' ? 'selected' : ''}>L</option>
            <option value="ml" ${item.unit === 'ml' ? 'selected' : ''}>mL</option>
          </select>
        </div>
      </div>
      <div class="d-flex gap-2 mt-2">
        <button type="submit" class="btn btn-sm btn-success">Enregistrer</button>
        <button type="button" class="btn btn-sm btn-secondary cancel-edit">Annuler</button>
      </div>
    `;
    
    // Gestionnaires d'événements
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Mettre à jour l'élément
      item.productName = form.productName.value;
      item.product_name = form.productName.value;
      item.quantity = parseFloat(form.quantity.value);
      item.unit = form.unit.value;
      
      // Envoyer la mise à jour au serveur
      fetch('/api/voice/update-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          item
        })
      }).catch(error => {
        console.error('Erreur lors de la mise à jour de l\'élément:', error);
      });
      
      // Mettre à jour l'interface
      element.querySelector('strong').textContent = item.productName;
      element.querySelector('span').textContent = `${item.quantity} ${item.unit}`;
      
      // Supprimer le formulaire
      form.remove();
      
      // Marquer comme confirmé
      element.classList.remove('border-warning', 'bg-warning-subtle');
      element.classList.add('border-success', 'bg-success-subtle');
      element.querySelector('.badge').className = 'badge bg-success';
      element.querySelector('.badge').textContent = 'Confirmé';
    });
    
    form.querySelector('.cancel-edit').addEventListener('click', () => {
      form.remove();
    });
    
    // Ajouter le formulaire à l'élément
    element.appendChild(form);
  },
  
  /**
   * Met en pause l'enregistrement
   * @returns {boolean} - Succès de la pause
   */
  pauseRecording() {
    if (!this.isRecording || this.isPaused) {
      return false;
    }
    
    console.log('Mise en pause de l\'enregistrement...');
    
    this.isPaused = true;
// Mettre en pause le MediaRecorder
this.mediaRecorder.pause();
    
// Mettre à jour l'interface utilisateur
this._updateUIForRecording();

// Notifier la pause de l'enregistrement
if (typeof this.callbacks.onRecordingPause === 'function') {
  this.callbacks.onRecordingPause();
}

console.log('Enregistrement mis en pause');
return true;
},

/**
* Reprend l'enregistrement
* @returns {boolean} - Succès de la reprise
*/
resumeRecording() {
if (!this.isRecording || !this.isPaused) {
  return false;
}

console.log('Reprise de l\'enregistrement...');

this.isPaused = false;

// Reprendre le MediaRecorder
this.mediaRecorder.resume();

// Mettre à jour l'interface utilisateur
this._updateUIForRecording();

// Notifier la reprise de l'enregistrement
if (typeof this.callbacks.onRecordingResume === 'function') {
  this.callbacks.onRecordingResume();
}

console.log('Enregistrement repris');
return true;
},

/**
* Arrête l'enregistrement
* @returns {Promise<boolean>} - Succès de l'arrêt
*/
async stopRecording() {
if (!this.isRecording) {
  return false;
}

console.log('Arrêt de l\'enregistrement...');

// Arrêter l'enregistrement
this.mediaRecorder.stop();
this.isRecording = false;
this.isPaused = false;

// Arrêter le timer
clearInterval(this.recordingTimer);

// Arrêter le stream audio
this.audioStream.getTracks().forEach(track => track.stop());

// Mettre à jour l'interface utilisateur
if (this.elements.recordButton) {
  this.elements.recordButton.innerHTML = '<i class="fas fa-microphone"></i>';
  this.elements.recordButton.classList.remove('btn-danger', 'btn-success');
  this.elements.recordButton.classList.add('btn-primary');
}

if (this.elements.stopButton) {
  this.elements.stopButton.disabled = true;
}

if (this.elements.statusDisplay) {
  this.elements.statusDisplay.textContent = 'Enregistrement terminé';
}

// Réactiver les sélecteurs
if (this.elements.locationSelect) {
  this.elements.locationSelect.disabled = false;
}

if (this.elements.periodInput) {
  this.elements.periodInput.disabled = false;
}

if (this.elements.modeSelect) {
  this.elements.modeSelect.disabled = false;
}

// Si en mode continu, traiter l'audio complet maintenant
if (this.recordingMode === 'continu' && this.audioChunks.length > 0) {
  try {
    await this._processContinuousRecording();
  } catch (error) {
    console.error('Erreur lors du traitement de l\'enregistrement continu:', error);
    this._notifyError(error);
  }
}

// Terminer la session sur le serveur
try {
  await this._finalizeSession();
} catch (error) {
  console.error('Erreur lors de la finalisation de la session:', error);
}

// Notifier l'arrêt de l'enregistrement
if (typeof this.callbacks.onRecordingStop === 'function') {
  this.callbacks.onRecordingStop();
}

console.log('Enregistrement arrêté avec succès');
return true;
},

/**
* Traite l'enregistrement continu complet
* @private
* @returns {Promise<void>}
*/
async _processContinuousRecording() {
try {
  console.log('Traitement de l\'enregistrement continu...');
  
  if (this.elements.processingSpinner) {
    this.elements.processingSpinner.classList.remove('d-none');
  }
  
  // Créer un blob à partir des chunks audio
  const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
  this.audioChunks = [];
  
  // Créer un formulaire pour l'envoi
  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('sessionId', this.sessionId);
  formData.append('mode', 'continu');
  formData.append('location', this.location);
  formData.append('period', this.period);
  
  // Envoyer l'audio au serveur pour traitement
  const response = await fetch('/api/voice/process', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Erreur de traitement audio: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Échec du traitement audio');
  }
  
  console.log('Enregistrement continu traité avec succès:', result);
  
  // Mettre à jour l'interface utilisateur avec les résultats
  this._updateUIWithContinuousResult(result);
} catch (error) {
  console.error('Erreur lors du traitement de l\'enregistrement continu:', error);
  this._notifyError(error);
  throw error;
} finally {
  if (this.elements.processingSpinner) {
    this.elements.processingSpinner.classList.add('d-none');
  }
}
},

/**
* Met à jour l'interface utilisateur avec les résultats de l'enregistrement continu
* @param {Object} result - Résultats de la reconnaissance
* @private
*/
_updateUIWithContinuousResult(result) {
// Mettre à jour la transcription
if (result.transcript && this.elements.transcriptionDisplay) {
  this.elements.transcriptionDisplay.textContent = result.transcript;
}

// Afficher les éléments reconnus
if (result.recognizedItems && this.elements.itemsContainer) {
  // Effacer le contenu existant
  this.elements.itemsContainer.innerHTML = '';
  
  // Ajouter chaque élément reconnu
  result.recognizedItems.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'recognized-item mb-2 p-2 border rounded';
    
    // Ajouter une classe selon le niveau de confiance
    if (item.needsReview) {
      itemElement.classList.add('border-warning', 'bg-warning-subtle');
    } else {
      itemElement.classList.add('border-success', 'bg-success-subtle');
    }
    
    // Créer le contenu de l'élément
    itemElement.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong>${item.productName || item.product_name || 'Produit inconnu'}</strong>
          <span class="ms-2">${item.quantity} ${item.unit}</span>
        </div>
        <div>
          ${item.needsReview 
            ? '<span class="badge bg-warning text-dark">À vérifier</span>' 
            : '<span class="badge bg-success">Confirmé</span>'}
        </div>
      </div>
      ${item.originalText ? `<div class="small text-muted mt-1">${item.originalText}</div>` : ''}
      ${item.confidence ? `<div class="small">Confiance: ${Math.round(item.confidence * 100)}%</div>` : ''}
    `;
    
    // Ajouter des boutons d'action si nécessaire
    if (item.needsReview) {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'mt-2 d-flex gap-2';
      
      // Bouton de confirmation
      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn btn-sm btn-success';
      confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirmer';
      confirmBtn.addEventListener('click', () => {
        item.needsReview = false;
        item.confirmed = true;
        itemElement.classList.remove('border-warning', 'bg-warning-subtle');
        itemElement.classList.add('border-success', 'bg-success-subtle');
        itemElement.querySelector('.badge').className = 'badge bg-success';
        itemElement.querySelector('.badge').textContent = 'Confirmé';
        actionsDiv.remove();
      });
      
      // Bouton de modification
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-sm btn-primary';
      editBtn.innerHTML = '<i class="fas fa-edit"></i> Modifier';
      editBtn.addEventListener('click', () => {
        this._editItem(item, itemElement);
      });
      
      // Bouton de suppression
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-sm btn-danger';
      deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Supprimer';
      deleteBtn.addEventListener('click', () => {
        itemElement.remove();
      });
      
      actionsDiv.appendChild(confirmBtn);
      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteBtn);
      itemElement.appendChild(actionsDiv);
    }
    
    this.elements.itemsContainer.appendChild(itemElement);
  });
  
  // Ajouter un message si aucun élément n'a été reconnu
  if (result.recognizedItems.length === 0) {
    const noItemsElement = document.createElement('div');
    noItemsElement.className = 'alert alert-info';
    noItemsElement.textContent = 'Aucun élément d\'inventaire n\'a été reconnu dans l\'enregistrement.';
    this.elements.itemsContainer.appendChild(noItemsElement);
  }
}
},

/**
* Finalise la session de reconnaissance vocale
* @private
* @returns {Promise<void>}
*/
async _finalizeSession() {
if (!this.sessionId) return;

try {
  console.log('Finalisation de la session de reconnaissance vocale...');
  
  const response = await fetch('/api/voice/finalize-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: this.sessionId
    })
  });
  
  if (!response.ok) {
    throw new Error(`Erreur de finalisation de session: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Échec de la finalisation de session');
  }
  
  console.log('Session finalisée avec succès');
  this.sessionId = null;
} catch (error) {
  console.error('Erreur lors de la finalisation de la session:', error);
  throw error;
}
},

/**
* Réinitialise l'enregistrement
* @returns {boolean} - Succès de la réinitialisation
*/
resetRecording() {
console.log('Réinitialisation de l\'enregistrement...');

// Si en cours d'enregistrement, l'arrêter d'abord
if (this.isRecording) {
  this.stopRecording();
}

// Réinitialiser les variables
this.audioChunks = [];
this.recordingDuration = 0;
this.sessionId = null;

// Réinitialiser l'interface utilisateur
if (this.elements.timerDisplay) {
  this.elements.timerDisplay.textContent = '00:00';
}

if (this.elements.statusDisplay) {
  this.elements.statusDisplay.textContent = 'Prêt à enregistrer';
}

if (this.elements.transcriptionDisplay) {
  this.elements.transcriptionDisplay.textContent = 'Aucun enregistrement traité';
}

if (this.elements.itemsContainer) {
  this.elements.itemsContainer.innerHTML = '';
}

if (this.elements.resetButton) {
  this.elements.resetButton.disabled = true;
}

// Réactiver les sélecteurs
if (this.elements.locationSelect) {
  this.elements.locationSelect.disabled = false;
}

if (this.elements.periodInput) {
  this.elements.periodInput.disabled = false;
}

if (this.elements.modeSelect) {
  this.elements.modeSelect.disabled = false;
}

console.log('Enregistrement réinitialisé');
return true;
},

/**
* Notifie une erreur
* @param {Error} error - Erreur à notifier
* @private
*/
_notifyError(error) {
console.error('Erreur de reconnaissance vocale:', error);

// Afficher un message d'erreur à l'utilisateur
if (this.elements.statusDisplay) {
  this.elements.statusDisplay.textContent = `Erreur: ${error.message}`;
}

// Appeler le callback d'erreur
if (typeof this.callbacks.onError === 'function') {
  this.callbacks.onError(error);
}
},

/**
* Vérifie si le navigateur prend en charge la reconnaissance vocale
* @returns {boolean} - Si la reconnaissance vocale est prise en charge
*/
isSupportedByBrowser() {
return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
},

/**
* Exporte les éléments reconnus au format JSON
* @returns {string} - Données JSON
*/
exportItemsAsJson() {
if (!this.elements.itemsContainer) {
  return '[]';
}

const items = [];
const itemElements = this.elements.itemsContainer.querySelectorAll('.recognized-item');

itemElements.forEach(itemElement => {
  // Extraire les données de l'élément
  const nameElement = itemElement.querySelector('strong');
  const quantityElement = itemElement.querySelector('span');
  
  if (nameElement && quantityElement) {
    const name = nameElement.textContent;
    const quantityUnit = quantityElement.textContent.trim().split(' ');
    const quantity = parseFloat(quantityUnit[0]);
    const unit = quantityUnit[1] || 'pièce';
    
    items.push({
      product_name: name,
      quantity,
      unit,
      location: this.location,
      period: this.period,
      timestamp: new Date().toISOString()
    });
  }
});

return JSON.stringify(items, null, 2);
},

/**
* Sauvegarde les éléments reconnus dans l'inventaire
* @returns {Promise<Object>} - Résultat de la sauvegarde
*/
async saveToInventory() {
try {
  if (!this.elements.itemsContainer) {
    throw new Error('Conteneur d\'éléments non défini');
  }
  
  const items = [];
  const itemElements = this.elements.itemsContainer.querySelectorAll('.recognized-item');
  
  itemElements.forEach(itemElement => {
    // Extraire les données de l'élément
    const nameElement = itemElement.querySelector('strong');
    const quantityElement = itemElement.querySelector('span');
    
    if (nameElement && quantityElement) {
      const name = nameElement.textContent;
      const quantityUnit = quantityElement.textContent.trim().split(' ');
      const quantity = parseFloat(quantityUnit[0]);
      const unit = quantityUnit[1] || 'pièce';
      
      items.push({
        product_name: name,
        quantity,
        unit,
        location: this.location,
        period: this.period,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  if (items.length === 0) {
    return { success: false, message: 'Aucun élément à sauvegarder' };
  }
  
  // Envoyer les éléments au serveur
  const response = await fetch('/api/inventory', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(items)
  });
  
  if (!response.ok) {
    throw new Error(`Erreur lors de la sauvegarde: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Échec de la sauvegarde');
  }
  
  return {
    success: true,
    savedItems: items.length,
    message: `${items.length} élément(s) sauvegardé(s) avec succès`
  };
} catch (error) {
  console.error('Erreur lors de la sauvegarde dans l\'inventaire:', error);
  return { success: false, error: error.message };
}
}
};

// Exporter le module
window.VoiceRecognition = VoiceRecognition;