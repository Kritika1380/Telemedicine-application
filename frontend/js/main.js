// Main SPA client script (copied) - uses /api endpoints proxied by Vercel
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
    if(id === 'home') {
      sections.forEach(s => {
        if(s.id === 'home' || s.id === 'services' || s.id === 'how' || s.id === 'about') {
          s.style.display = 'block';
        } else if(s.id === 'dashboard') {
          s.style.display = 'none';
        } else {
          s.style.display = 'none';
        }
      })
    } else {
      sections.forEach(s => { 
        if(s.id === id) {
          s.style.display = 'block';
        } else if(s.id === 'dashboard') {
          s.style.display = 'none';
        } else {
          s.style.display = 'none';
        }
      })
    }
    navLinks.forEach(a => a.classList.toggle('active', a.dataset.target === id))
    window.scrollTo({top: 0, behavior: 'smooth'})
  }

  navLinks.forEach(a=>a.addEventListener('click', e=>{ 
    e.preventDefault(); 
    const t=a.dataset.target; 
    if(t) showSection(t);
  }))

  function showModal(el){ el.setAttribute('aria-hidden','false') }
  function hideModal(el){ el.setAttribute('aria-hidden','true') }

  loginBtn && loginBtn.addEventListener('click', ()=> {
    if(localStorage.getItem('nc_token')) {
      enterDashboard()
    } else {
      showModal(loginModal)
    }
  })
  closeLogin && closeLogin.addEventListener('click', ()=> hideModal(loginModal))

  startBtn && startBtn.addEventListener('click', ()=> {
    if(localStorage.getItem('nc_token')) {
      enterDashboard()
    } else {
      showModal(loginModal)
    }
  })
  fillSymptoms && fillSymptoms.addEventListener('click', ()=> showModal(symptomModal))
  closeSymptom && closeSymptom.addEventListener('click', ()=> hideModal(symptomModal))
  document.getElementById('cancelSymptom') && document.getElementById('cancelSymptom').addEventListener('click', ()=> hideModal(symptomModal))

  if(loginForm){
    loginForm.addEventListener('submit', async (ev)=>{
      ev.preventDefault()
      const email = document.getElementById('loginEmail').value
      const password = document.getElementById('loginPassword').value
      const role = document.getElementById('loginRole').value
      try{
        const url = apiBase+'/login'
        const res = await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,role})})
        const data = await res.json()
        if(data.ok){
          localStorage.setItem('nc_token', data.token)
          localStorage.setItem('nc_role', data.role)
          localStorage.setItem('nc_name', data.name)
          hideModal(loginModal)
          enterDashboard()
        } else alert(data.message || 'Login failed')
      }catch(err){
        alert('Network error: ' + err.message + '\n\nMake sure the server is running and /api is reachable')
      }
    })
  }

  async function enterDashboard(){
    const token = localStorage.getItem('nc_token')
    const role = localStorage.getItem('nc_role')
    if(!token) return
    sections.forEach(s=>s.style.display='none')
    dashboardSection.style.display = 'block'
    try{
      const url = apiBase+'/dashboard?role='+(role||'patient')
      const res = await fetch(url,{headers:{'authorization':'Bearer '+token}})
      const data = await res.json()
      renderDashboard(data)
    }catch(err){console.error(err);alert('Error loading dashboard')}
  }

  function renderDashboard(data){
    const role = data.role || 'patient'
    dashboardTitle.textContent = (role==='doctor')?`Doctor Dashboard`:(role==='admin'?`Admin Dashboard`:`Patient Dashboard`)
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
    const main = document.getElementById('dashboardMain')
    if(main){
      main.innerHTML = data.mainHtml || '<div class="card" style="padding:1rem;margin-top:1rem">Welcome to your dashboard.</div>'
    }
  }

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

  logoutBtn && logoutBtn.addEventListener('click', async ()=>{
    const token = localStorage.getItem('nc_token')
    try{ await fetch(apiBase+'/logout',{method:'POST',headers:{'authorization':'Bearer '+token}}) }catch(e){}
    localStorage.clear(); 
    dashboardSection.style.display='none'; 
    showSection('home');
    alert('Logged out successfully')
  })

  if(localStorage.getItem('nc_token')) {
    const userName = localStorage.getItem('nc_name') || 'User'
    if(loginBtn) {
      loginBtn.textContent = `Dashboard (${userName})`
      loginBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${userName}`
    }
  }

  document.getElementById('quickConsult') && document.getElementById('quickConsult').addEventListener('click', ()=> showModal(loginModal))
  document.getElementById('openProfile') && document.getElementById('openProfile').addEventListener('click', ()=> alert('Profile - coming soon'))

  const registerModal = document.getElementById('registerModal')
  const closeRegister = document.getElementById('closeRegister')
  const registerForm = document.getElementById('registerForm')
  const toRegisterBtn = document.getElementById('toRegister')
  const backToLoginBtn = document.getElementById('backToLogin')

  if(toRegisterBtn){
    toRegisterBtn.addEventListener('click', ()=>{
      hideModal(loginModal)
      showModal(registerModal)
    })
  }

  closeRegister && closeRegister.addEventListener('click', ()=> hideModal(registerModal))
  backToLoginBtn && backToLoginBtn.addEventListener('click', ()=>{ hideModal(registerModal); showModal(loginModal) })

  if(registerForm){
    registerForm.addEventListener('submit', async (ev)=>{
      ev.preventDefault()
      const password = document.getElementById('regPassword').value
      const confirmPassword = document.getElementById('regConfirmPassword').value
      if(password !== confirmPassword){ alert('Passwords do not match!'); return }
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
        if(data.ok){ alert('Registration successful! Please login with your credentials.'); hideModal(registerModal); showModal(loginModal); document.getElementById('loginEmail').value = payload.email }
        else { alert(data.message || 'Registration failed') }
      }catch(err){ console.error(err); alert('Network error during registration') }
    })
  }

  const howItWorksLinks = document.querySelectorAll('a[data-target="how"]')
  howItWorksLinks.forEach(link=>{ link.addEventListener('click', e=>{ e.preventDefault(); showSection('how') }) })

  const mapModal = document.getElementById('mapModal')
  const closeMap = document.getElementById('closeMap')
  let userCoords = null
  closeMap && closeMap.addEventListener('click', ()=> hideModal(mapModal))

  function showDiseaseMap(){ showModal(mapModal); loadDiseaseMap() }
  async function loadDiseaseMap(){ /* omitted in copy for brevity */ }
})();
