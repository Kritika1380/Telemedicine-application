// Main SPA client script: navigation, modals, API calls and dashboard rendering
(function(){
  const apiBase = '/api'

  // Elements
  const navLinks = document.querySelectorAll('.nav-link')
  const sections = document.querySelectorAll('main section')
  const loginBtn = document.getElementById('loginBtn')
  const loginModal = document.getElementById('loginModal')
  const closeLogin = document.getElementById('closeLogin')
  const loginForm = document.getElementById('loginForm')
  const startBtn = document.getElementById('startBtn')
  const fillSymptoms = document.getElementById('fillSymptoms')
  const symptomModal = document.getElementById('symptomModal')
  const closeSymptom = document.getElementById('closeSymptom')
  const symptomForm = document.getElementById('symptomForm')
  const logoutBtn = document.getElementById('logoutBtn')
  const dashboardSection = document.getElementById('dashboard')
  const statsGrid = document.getElementById('statsGrid')
  const dashboardTitle = document.getElementById('dashboardTitle')

  function showSection(id){
    // Special handling for home - show all landing sections
    if(id === 'home') {
      sections.forEach(s => {
        // Show all public sections (home, services, how, about)
        if(s.id === 'home' || s.id === 'services' || s.id === 'how' || s.id === 'about') {
          s.style.display = 'block';
        } else if(s.id === 'dashboard') {
          s.style.display = 'none';
        } else {
          s.style.display = 'none';
        }
      })
    } else {
      // For other sections, hide all except target
      sections.forEach(s => { 
        if(s.id === id) {
          s.style.display = 'block';
        } else if(s.id === 'dashboard') {
          // keep dashboard hidden unless logged in
          s.style.display = 'none';
        } else {
          s.style.display = 'none';
        }
      })
    }
    navLinks.forEach(a => a.classList.toggle('active', a.dataset.target === id))
    // Scroll to top smoothly
    window.scrollTo({top: 0, behavior: 'smooth'})
  }

  // nav link clicks
  navLinks.forEach(a=>a.addEventListener('click', e=>{ 
    e.preventDefault(); 
    const t=a.dataset.target; 
    if(t) showSection(t);
  }))

  // modal helpers
  function showModal(el){ el.setAttribute('aria-hidden','false') }
  function hideModal(el){ el.setAttribute('aria-hidden','true') }

  loginBtn && loginBtn.addEventListener('click', ()=> {
    // If already logged in, go to dashboard instead of showing login modal
    if(localStorage.getItem('nc_token')) {
      enterDashboard()
    } else {
      showModal(loginModal)
    }
  })
  closeLogin && closeLogin.addEventListener('click', ()=> hideModal(loginModal))

  startBtn && startBtn.addEventListener('click', ()=> {
    // If already logged in, go to dashboard instead of showing login modal
    if(localStorage.getItem('nc_token')) {
      enterDashboard()
    } else {
      showModal(loginModal)
    }
  })
  fillSymptoms && fillSymptoms.addEventListener('click', ()=> showModal(symptomModal))
  closeSymptom && closeSymptom.addEventListener('click', ()=> hideModal(symptomModal))
  document.getElementById('cancelSymptom') && document.getElementById('cancelSymptom').addEventListener('click', ()=> hideModal(symptomModal))

  // login
  if(loginForm){
    loginForm.addEventListener('submit', async (ev)=>{
      ev.preventDefault()
      const email = document.getElementById('loginEmail').value
      const password = document.getElementById('loginPassword').value
      const role = document.getElementById('loginRole').value
      console.log('Attempting login with:', {email, role})
      try{
        const url = apiBase+'/login'
        console.log('Fetching:', url)
        const res = await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,role})})
        console.log('Response status:', res.status)
        const data = await res.json()
        console.log('Response data:', data)
        if(data.ok){
          localStorage.setItem('nc_token', data.token)
          localStorage.setItem('nc_role', data.role)
          localStorage.setItem('nc_name', data.name)
          hideModal(loginModal)
          enterDashboard()
        } else alert(data.message || 'Login failed')
      }catch(err){
        console.error('Login error:', err)
        alert('Network error: ' + err.message + '\n\nMake sure the server is running on http://localhost:3000')
      }
    })
  }

  async function enterDashboard(){
    const token = localStorage.getItem('nc_token')
    const role = localStorage.getItem('nc_role')
    if(!token) return
    // hide all other sections and show dashboard
    sections.forEach(s=>s.style.display='none')
    dashboardSection.style.display = 'block'
    // fetch dashboard data with role
    try{
      const url = apiBase+'/dashboard?role='+(role||'patient')
      const res = await fetch(url,{headers:{'authorization':'Bearer '+token}})
      const data = await res.json()
      console.log('Dashboard data received:', data)
      renderDashboard(data)
    }catch(err){console.error(err);alert('Error loading dashboard')}
  }

  function renderDashboard(data){
    console.log('Rendering dashboard with data:', data)
    const role = data.role || 'patient'
    dashboardTitle.textContent = (role==='doctor')?`Doctor Dashboard`:(role==='admin'?`Admin Dashboard`:`Patient Dashboard`)
    
    // render stats
    if(statsGrid){
      statsGrid.innerHTML = ''
      if(data.stats && data.stats.length > 0){
        data.stats.forEach(s=>{
          const card = document.createElement('div')
          card.className='card'
          card.innerHTML = `<div class="stat-icon"><i class="${s.icon||'fas fa-chart-line'}"></i></div><div><h3>${s.value}</h3><p class="muted">${s.label}</p></div>`
          statsGrid.appendChild(card)
        })
      }
    }
    
    // main area
    const main = document.getElementById('dashboardMain')
    if(main){
      main.innerHTML = data.mainHtml || '<div class="card" style="padding:1rem;margin-top:1rem">Welcome to your dashboard.</div>'
    }
  }

  // symptom submit
  if(symptomForm){
    symptomForm.addEventListener('submit', async (ev)=>{
      ev.preventDefault()
      const payload = {
        name: document.getElementById('s_name').value,
        age: document.getElementById('s_age').value,
        phone: document.getElementById('s_phone').value,
        urgency: document.getElementById('s_urgency').value,
        description: document.getElementById('s_desc').value
      }
      try{
        const res = await fetch(apiBase+'/symptom',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)})
        const data = await res.json()
        if(data.ok){ hideModal(symptomModal); alert('Submitted — a doctor will review shortly.') }
        else alert('Error submitting')
      }catch(err){console.error(err);alert('Network error')}
    })
  }

  // logout
  logoutBtn && logoutBtn.addEventListener('click', async ()=>{
    const token = localStorage.getItem('nc_token')
    try{ await fetch(apiBase+'/logout',{method:'POST',headers:{'authorization':'Bearer '+token}}) }catch(e){}
    localStorage.clear(); 
    dashboardSection.style.display='none'; 
    showSection('home');
    alert('Logged out successfully')
  })

  // Don't auto-enter dashboard - let user navigate manually
  // User stays on landing page even if logged in
  // Update login button text if user is already logged in
  if(localStorage.getItem('nc_token')) {
    const userName = localStorage.getItem('nc_name') || 'User'
    if(loginBtn) {
      loginBtn.textContent = `Dashboard (${userName})`
      loginBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${userName}`
    }
  }

  // quick actions
  document.getElementById('quickConsult') && document.getElementById('quickConsult').addEventListener('click', ()=> showModal(loginModal))
  document.getElementById('openProfile') && document.getElementById('openProfile').addEventListener('click', ()=> alert('Profile - coming soon'))

  // Register modal elements
  const registerModal = document.getElementById('registerModal')
  const closeRegister = document.getElementById('closeRegister')
  const registerForm = document.getElementById('registerForm')
  const toRegisterBtn = document.getElementById('toRegister')
  const backToLoginBtn = document.getElementById('backToLogin')

  // Register button functionality
  if(toRegisterBtn){
    toRegisterBtn.addEventListener('click', ()=>{
      hideModal(loginModal)
      showModal(registerModal)
    })
  }

  // Close register modal
  closeRegister && closeRegister.addEventListener('click', ()=> hideModal(registerModal))
  
  // Back to login
  backToLoginBtn && backToLoginBtn.addEventListener('click', ()=>{
    hideModal(registerModal)
    showModal(loginModal)
  })

  // Registration form submission
  if(registerForm){
    registerForm.addEventListener('submit', async (ev)=>{
      ev.preventDefault()
      
      // Validation
      const password = document.getElementById('regPassword').value
      const confirmPassword = document.getElementById('regConfirmPassword').value
      
      if(password !== confirmPassword){
        alert('Passwords do not match!')
        return
      }

      const payload = {
        firstName: document.getElementById('regFirstName').value,
        lastName: document.getElementById('regLastName').value,
        email: document.getElementById('regEmail').value,
        password: password,
        phone: document.getElementById('regPhone').value,
        dob: document.getElementById('regDob').value,
        gender: document.getElementById('regGender').value,
        role: document.getElementById('regRole').value
      }

      try{
        const res = await fetch(apiBase+'/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)})
        const data = await res.json()
        if(data.ok){
          alert('Registration successful! Please login with your credentials.')
          hideModal(registerModal)
          showModal(loginModal)
          // Pre-fill login email
          document.getElementById('loginEmail').value = payload.email
        } else {
          alert(data.message || 'Registration failed')
        }
      }catch(err){
        console.error(err)
        alert('Network error during registration')
      }
    })
  }

  // Make "How it works" link in hero work
  const howItWorksLinks = document.querySelectorAll('a[data-target="how"]')
  howItWorksLinks.forEach(link=>{
    link.addEventListener('click', e=>{
      e.preventDefault()
      showSection('how')
    })
  })

  // Disease Hotspot Map Feature
  const mapModal = document.getElementById('mapModal')
  const closeMap = document.getElementById('closeMap')
  let userCoords = null

  closeMap && closeMap.addEventListener('click', ()=> hideModal(mapModal))

  function showDiseaseMap(){
    showModal(mapModal)
    loadDiseaseMap()
  }

  async function loadDiseaseMap(){
    const mapContainer = document.getElementById('mapContainer')
    const userLocationEl = document.getElementById('userLocation')
    const hotspotList = document.getElementById('hotspotList')

    // Get user location
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(async (position)=>{
        userCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        
        // Reverse geocode to get location name
        try{
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${userCoords.lat}&lon=${userCoords.lng}&format=json`)
          const data = await res.json()
          const location = data.address.city || data.address.town || data.address.county || 'Unknown'
          userLocationEl.textContent = `${location}, ${data.address.country}`
        }catch(e){
          userLocationEl.textContent = `Lat: ${userCoords.lat.toFixed(4)}, Lng: ${userCoords.lng.toFixed(4)}`
        }

        // Render map using Leaflet
        renderMap(mapContainer, userCoords)
        
        // Fetch and display hotspots
        const hotspots = await fetchDiseaseHotspots(userCoords)
        displayHotspots(hotspotList, hotspots)
      }, (error)=>{
        userLocationEl.textContent = 'Location access denied'
        mapContainer.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;"><i class="fas fa-map-marker-alt fa-3x" style="color:#6b7280;"></i><p style="margin-top:1rem;color:#6b7280;">Unable to access location.<br>Using demo data.</p></div>'
        // Use demo coordinates
        userCoords = {lat: 40.7128, lng: -74.0060} // New York
        const hotspots = generateDemoHotspots(userCoords)
        displayHotspots(hotspotList, hotspots)
      })
    } else {
      userLocationEl.textContent = 'Geolocation not supported'
      mapContainer.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;"><p style="color:#6b7280;">Geolocation not supported by browser</p></div>'
    }
  }

  function renderMap(container, coords){
    // Clear container
    container.innerHTML = ''
    
    // Initialize Leaflet map
    const map = L.map(container).setView([coords.lat, coords.lng], 13)
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)
    
    // Add user location marker
    const userIcon = L.divIcon({
      className: 'user-marker',
      html: '<div style="width:20px;height:20px;background:#1e90ff;border-radius:50%;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);animation:pulse 2s infinite;"></div>',
      iconSize: [20, 20]
    })
    L.marker([coords.lat, coords.lng], {icon: userIcon})
      .addTo(map)
      .bindPopup('<strong>You are here</strong>')
    
    // Add disease hotspot markers
    addDiseaseMarkers(map, coords)
    
    // Store map reference for cleanup
    container._leafletMap = map
  }

  function addDiseaseMarkers(map, userCoords){
    // Generate hotspot locations around user (offset in lat/lng degrees)
    const markers = [
      {lat: userCoords.lat + 0.02, lng: userCoords.lng - 0.025, risk:'high', disease:'Influenza', cases:47, distance:'2.3 km'},
      {lat: userCoords.lat + 0.015, lng: userCoords.lng + 0.03, risk:'medium', disease:'COVID-19', cases:12, distance:'4.1 km'},
      {lat: userCoords.lat - 0.025, lng: userCoords.lng - 0.035, risk:'low', disease:'Common Cold', cases:8, distance:'5.8 km'},
      {lat: userCoords.lat - 0.028, lng: userCoords.lng + 0.032, risk:'medium', disease:'Dengue', cases:18, distance:'3.5 km'},
      {lat: userCoords.lat + 0.025, lng: userCoords.lng + 0.01, risk:'high', disease:'Flu Outbreak', cases:32, distance:'1.9 km'}
    ]
    
    const colors = {high:'#ef4444', medium:'#f59e0b', low:'#10b981'}
    
    markers.forEach(m => {
      const markerIcon = L.divIcon({
        className: 'disease-marker',
        html: `<div style="width:16px;height:16px;background:${colors[m.risk]};border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;"></div>`,
        iconSize: [16, 16]
      })
      
      L.marker([m.lat, m.lng], {icon: markerIcon})
        .addTo(map)
        .bindPopup(`
          <div style="min-width:150px;">
            <h4 style="margin:0 0 0.5rem 0;color:${colors[m.risk]};">${m.disease}</h4>
            <p style="margin:0.25rem 0;font-size:0.9rem;"><strong>${m.cases}</strong> reported cases</p>
            <p style="margin:0.25rem 0;font-size:0.85rem;color:#6b7280;">${m.distance} from your location</p>
            <span style="background:${colors[m.risk]};color:white;padding:0.15rem 0.4rem;border-radius:4px;font-size:0.75rem;">${m.risk.toUpperCase()} RISK</span>
          </div>
        `)
    })
  }

  async function fetchDiseaseHotspots(coords){
    // In production, this would call a real disease tracking API
    return generateDemoHotspots(coords)
  }

  function generateDemoHotspots(coords){
    return [
      {disease:'Influenza',cases:47,risk:'high',distance:'2.3 km',direction:'North',trend:'increasing'},
      {disease:'Flu Outbreak',cases:32,risk:'high',distance:'1.9 km',direction:'Northeast',trend:'stable'},
      {disease:'Dengue',cases:18,risk:'medium',distance:'3.5 km',direction:'South',trend:'increasing'},
      {disease:'COVID-19 Variant',cases:12,risk:'medium',distance:'4.1 km',direction:'East',trend:'decreasing'},
      {disease:'Common Cold',cases:8,risk:'low',distance:'5.8 km',direction:'Northwest',trend:'stable'}
    ]
  }

  function displayHotspots(container, hotspots){
    const riskColors = {high:'#ef4444',medium:'#f59e0b',low:'#10b981'}
    const trendIcons = {increasing:'fa-arrow-up',decreasing:'fa-arrow-down',stable:'fa-minus'}
    
    container.innerHTML = hotspots.map(h=>`
      <div class="card" style="padding:0.75rem;margin-bottom:0.5rem;border-left:4px solid ${riskColors[h.risk]};">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div style="flex:1;">
            <h5 style="margin:0 0 0.25rem 0;font-size:0.95rem;">${h.disease}</h5>
            <p style="margin:0;font-size:0.8rem;color:#6b7280;">
              <i class="fas fa-map-marker-alt"></i> ${h.distance} ${h.direction}<br>
              <strong>${h.cases}</strong> cases
              <i class="fas ${trendIcons[h.trend]}" style="margin-left:0.25rem;color:${h.trend==='increasing'?'#ef4444':h.trend==='decreasing'?'#10b981':'#6b7280'};"></i>
            </p>
          </div>
          <span style="background:${riskColors[h.risk]};color:white;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.75rem;white-space:nowrap;">${h.risk.toUpperCase()}</span>
        </div>
      </div>
    `).join('')
  }

  // Video Call Functionality
  const videoCallModal = document.getElementById('videoCallModal')
  const closeVideoCall = document.getElementById('closeVideoCall')
  let localStream = null
  let remoteStream = null
  let callStartTime = null
  let callTimerInterval = null
  let isMicEnabled = true
  let isCameraEnabled = true

  async function startVideoCall(participantName = 'Doctor') {
    try {
      document.getElementById('videoParticipantName').textContent = participantName
      showModal(videoCallModal)
      
      // Request media permissions
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      
      const localVideo = document.getElementById('localVideo')
      localVideo.srcObject = localStream
      document.getElementById('localPlaceholder').style.display = 'none'
      
      // Simulate remote connection (in production, this would use WebRTC)
      setTimeout(() => {
        document.getElementById('remotePlaceholder').innerHTML = '<i class="fas fa-user-md" style="font-size:4rem;margin-bottom:1rem;opacity:0.5;"></i><p style="font-size:1.2rem;">Doctor is in the call</p>'
      }, 2000)
      
      // Start call timer
      callStartTime = Date.now()
      callTimerInterval = setInterval(updateCallTimer, 1000)
      
    } catch (error) {
      console.error('Error starting video call:', error)
      alert('Unable to access camera/microphone. Please check permissions.')
    }
  }

  function updateCallTimer() {
    if (!callStartTime) return
    const elapsed = Math.floor((Date.now() - callStartTime) / 1000)
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0')
    const seconds = (elapsed % 60).toString().padStart(2, '0')
    document.getElementById('videoCallTimer').textContent = `${minutes}:${seconds}`
  }

  function toggleMic() {
    if (!localStream) return
    isMicEnabled = !isMicEnabled
    localStream.getAudioTracks().forEach(track => track.enabled = isMicEnabled)
    const micBtn = document.getElementById('micBtn')
    micBtn.innerHTML = isMicEnabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>'
    micBtn.style.background = isMicEnabled ? 'rgba(255,255,255,0.1)' : '#ef4444'
  }

  function toggleCamera() {
    if (!localStream) return
    isCameraEnabled = !isCameraEnabled
    localStream.getVideoTracks().forEach(track => track.enabled = isCameraEnabled)
    const cameraBtn = document.getElementById('cameraBtn')
    cameraBtn.innerHTML = isCameraEnabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>'
    cameraBtn.style.background = isCameraEnabled ? 'rgba(255,255,255,0.1)' : '#ef4444'
    document.getElementById('localPlaceholder').style.display = isCameraEnabled ? 'none' : 'flex'
  }

  async function toggleScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const remoteVideo = document.getElementById('remoteVideo')
      remoteVideo.srcObject = screenStream
      document.getElementById('remotePlaceholder').style.display = 'none'
      
      screenStream.getVideoTracks()[0].onended = () => {
        remoteVideo.srcObject = null
        document.getElementById('remotePlaceholder').style.display = 'flex'
      }
    } catch (error) {
      console.error('Error sharing screen:', error)
    }
  }

  function toggleVideoChat() {
    alert('Chat feature coming soon!')
  }

  function endVideoCall() {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      localStream = null
    }
    if (callTimerInterval) {
      clearInterval(callTimerInterval)
      callTimerInterval = null
    }
    callStartTime = null
    hideModal(videoCallModal)
    
    // Reset video elements
    const localVideo = document.getElementById('localVideo')
    const remoteVideo = document.getElementById('remoteVideo')
    localVideo.srcObject = null
    remoteVideo.srcObject = null
    document.getElementById('localPlaceholder').style.display = 'flex'
    document.getElementById('remotePlaceholder').style.display = 'flex'
    
    // Reset buttons
    isMicEnabled = true
    isCameraEnabled = true
    document.getElementById('micBtn').innerHTML = '<i class="fas fa-microphone"></i>'
    document.getElementById('cameraBtn').innerHTML = '<i class="fas fa-video"></i>'
    
    alert('Call ended. Consultation summary will be available in your dashboard.')
  }

  // Appointment Management
  const appointmentModal = document.getElementById('appointmentModal')
  const closeAppointment = document.getElementById('closeAppointment')
  const appointmentForm = document.getElementById('appointmentForm')

  closeAppointment && closeAppointment.addEventListener('click', () => closeAppointmentModal())

  function openAppointmentModal() {
    showModal(appointmentModal)
    loadUserAppointments()
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0]
    document.getElementById('apptDate').min = today
  }

  function closeAppointmentModal() {
    hideModal(appointmentModal)
  }

  async function loadUserAppointments() {
    const token = localStorage.getItem('nc_token')
    if (!token) return

    try {
      const res = await fetch(apiBase + '/appointments', {
        headers: { 'authorization': 'Bearer ' + token }
      })
      const data = await res.json()
      
      if (data.ok && data.appointments) {
        renderAppointments(data.appointments)
      }
    } catch (error) {
      console.error('Error loading appointments:', error)
    }
  }

  function renderAppointments(appointments) {
    const container = document.getElementById('appointmentsList')
    
    if (!appointments || appointments.length === 0) {
      container.innerHTML = '<p class="muted" style="text-align:center;padding:1rem;">No upcoming appointments</p>'
      return
    }

    container.innerHTML = appointments.map(appt => {
      const date = new Date(appt.scheduledDate)
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      
      return `
        <div class="card" style="padding:1rem;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h4 style="margin:0;color:#0f172a;">${appt.doctorName || 'Doctor'}</h4>
            <p style="margin:0.25rem 0;color:#6b7280;font-size:0.9rem;">
              <i class="fas fa-calendar"></i> ${dateStr} at ${timeStr}
            </p>
            <p style="margin:0.25rem 0;color:#6b7280;font-size:0.85rem;">
              <i class="fas fa-${appt.type === 'video' ? 'video' : appt.type === 'phone' ? 'phone' : 'hospital'}"></i> ${appt.type.charAt(0).toUpperCase() + appt.type.slice(1)}
            </p>
          </div>
          <div style="display:flex;gap:0.5rem;">
            ${appt.status === 'scheduled' ? `
              <button class="btn btn-primary" style="font-size:0.9rem;" onclick="startVideoCall('${appt.doctorName || 'Doctor'}')">
                <i class="fas fa-video"></i> Join
              </button>
              <button class="btn btn-danger" style="font-size:0.9rem;" onclick="cancelAppointment('${appt._id}')">
                <i class="fas fa-times"></i>
              </button>
            ` : `
              <span style="background:#dcfce7;padding:0.5rem 1rem;border-radius:6px;font-size:0.85rem;color:#166534;">${appt.status}</span>
            `}
          </div>
        </div>
      `
    }).join('')
  }

  if (appointmentForm) {
    appointmentForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      
      const token = localStorage.getItem('nc_token')
      if (!token) {
        alert('Please login to book appointments')
        return
      }

      const formData = {
        doctor: document.getElementById('apptDoctor').value,
        type: document.getElementById('apptType').value,
        date: document.getElementById('apptDate').value,
        time: document.getElementById('apptTime').value,
        reason: document.getElementById('apptReason').value
      }

      try {
        const res = await fetch(apiBase + '/appointments', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': 'Bearer ' + token
          },
          body: JSON.stringify(formData)
        })

        const data = await res.json()
        
        if (data.ok) {
          alert('Appointment booked successfully!')
          appointmentForm.reset()
          loadUserAppointments()
        } else {
          alert(data.message || 'Failed to book appointment')
        }
      } catch (error) {
        console.error('Error booking appointment:', error)
        alert('Error booking appointment')
      }
    })
  }

  async function cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return

    const token = localStorage.getItem('nc_token')
    try {
      const res = await fetch(apiBase + '/appointments/' + appointmentId, {
        method: 'DELETE',
        headers: { 'authorization': 'Bearer ' + token }
      })

      const data = await res.json()
      if (data.ok) {
        alert('Appointment cancelled successfully')
        loadUserAppointments()
      } else {
        alert(data.message || 'Failed to cancel appointment')
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      alert('Error cancelling appointment')
    }
  }

  // Patient Records Modal
  const patientRecordsModal = document.getElementById('patientRecordsModal')
  const closePatientRecords = document.getElementById('closePatientRecords')

  closePatientRecords && closePatientRecords.addEventListener('click', () => closePatientRecordsModal())

  // Close modal when clicking outside
  patientRecordsModal && patientRecordsModal.addEventListener('click', (e) => {
    if (e.target === patientRecordsModal) {
      closePatientRecordsModal()
    }
  })

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && patientRecordsModal && patientRecordsModal.getAttribute('aria-hidden') === 'false') {
      closePatientRecordsModal()
    }
  })

  function viewPatientRecords(patientName) {
    // Update patient name in modal
    document.getElementById('patientRecordName').textContent = patientName
    
    // In production, this would fetch real patient data from API
    // For now, showing demo data
    showModal(patientRecordsModal)
  }

  function closePatientRecordsModal() {
    hideModal(patientRecordsModal)
  }

  // Make functions globally available
  window.startVideoCall = startVideoCall
  window.toggleMic = toggleMic
  window.toggleCamera = toggleCamera
  window.toggleScreenShare = toggleScreenShare
  window.toggleVideoChat = toggleVideoChat
  window.endVideoCall = endVideoCall
  window.openAppointmentModal = openAppointmentModal
  window.closeAppointmentModal = closeAppointmentModal
  window.cancelAppointment = cancelAppointment
  window.viewPatientRecords = viewPatientRecords
  window.closePatientRecordsModal = closePatientRecordsModal

  // expose for debugging
  window.NC = {enterDashboard, showSection, showDiseaseMap, startVideoCall, openAppointmentModal}

})();
