const NOTE_COLORS = ['#fef9c3', '#fce7f3', '#dbeafe', '#dcfce7', '#ffe4cc', '#f0e6ff', '#fff0d4']
const CACHE_KEY = 'moodboard_cache'

let editMode = false
let zIdx = 100
const world = document.getElementById('world')
let vx = 0,
  vy = 0,
  vs = 1
const vRef = {
  x: 0,
  y: 0,
  s: 1
}

const rand = (a, b) => a + Math.random() * (b - a)
const randInt = (a, b) => Math.floor(rand(a, b + 1))
const uid = () => Math.random().toString(36).slice(2, 9)

// Marking during loading
function showLoading() {
  let el = document.getElementById('loading-overlay')
  if (!el) {
    el = document.createElement('div')
    el.id = 'loading-overlay'
    el.innerHTML = `<span>로드 중...</span>`
    document.body.appendChild(el)
  }
  el.style.opacity = 1
}

function hideLoading() {
  const el = document.getElementById('loading-overlay')
  if (el) el.style.opacity = 0
}

// Cache Utilities
function saveToLocalCache(cards) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      cards,
      view: {
        x: vRef.x,
        y: vRef.y,
        s: vRef.s
      },
      savedAt: Date.now()
    }))
  } catch (e) {
    console.warn('로컬 캐시 저장 실패:', e)
  }
}

function saveViewToCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const data = raw ? JSON.parse(raw) : {}
    data.view = {
      x: vRef.x,
      y: vRef.y,
      s: vRef.s
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch (e) {}
}

function loadFromLocalCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

// Control View (Zoom/Move)
let _saveViewTimer = null

function applyView(x, y, s) {
  vx = x;
  vy = y;
  vs = s;
  vRef.x = x;
  vRef.y = y;
  vRef.s = s
  world.style.transform = `translate(${x}px,${y}px) scale(${s})`
  const badge = document.getElementById('zoom-badge');
  if (badge) badge.textContent = Math.round(s * 100) + '%';
  clearTimeout(_saveViewTimer)
  _saveViewTimer = setTimeout(saveViewToCache, 500)
}

function zoomAt(cx, cy, factor) {
  const ns = Math.min(4, Math.max(0.15, vRef.s * factor));
  const r = ns / vRef.s
  applyView(cx - r * (cx - vRef.x), cy - r * (cy - vRef.y), ns)
}

function worldCenter() {
  return {
    x: (window.innerWidth / 2 - vRef.x) / vRef.s,
    y: (window.innerHeight / 2 - vRef.y) / vRef.s
  }
}

// Event Listener (Desktop & Mobile Zoom/Pan)
window.addEventListener('wheel', e => {
  e.preventDefault();
  zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.08 : 1 / 1.08)
}, {
  passive: false
})

let panning = false,
  panSX, panSY, panOX, panOY
document.addEventListener('contextmenu', e => e.preventDefault())

// Desktop Pan
document.addEventListener('mousedown', e => {
  if (e.button === 1 || e.button === 2) {
    panning = true;
    panSX = e.clientX;
    panSY = e.clientY;
    panOX = vRef.x;
    panOY = vRef.y;
    e.preventDefault();
  }

  if (!e.target.closest('.card')) {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
  }
});
document.addEventListener('mousemove', e => {
  if (panning) applyView(panOX + (e.clientX - panSX), panOY + (e.clientY - panSY), vRef.s)
})
document.addEventListener('mouseup', () => panning = false)

// Mobile Touch Pan & Pinch Zoom
let touchStartDist = 0;
let isPinching = false;

document.addEventListener('touchstart', e => {
  if (e.target.closest('.card') && editMode) return; // Prevent canvas movement when operating a card in edit mode

  if (e.touches.length === 1) {
    panning = true;
    panSX = e.touches[0].clientX;
    panSY = e.touches[0].clientY;
    panOX = vRef.x;
    panOY = vRef.y;
  } else if (e.touches.length === 2) {
    panning = false;
    isPinching = true;
    touchStartDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
}, {
  passive: false
});

document.addEventListener('touchmove', e => {
  if (e.target.closest('.card') && editMode) return;

  if (panning && e.touches.length === 1) {
    const touch = e.touches[0];
    applyView(panOX + (touch.clientX - panSX), panOY + (touch.clientY - panSY), vRef.s);
    e.preventDefault();
  } else if (isPinching && e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const factor = dist / touchStartDist;

    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

    zoomAt(centerX, centerY, factor);
    touchStartDist = dist; // Renew for continuous smooth zoom
    e.preventDefault();
  }
}, {
  passive: false
});

document.addEventListener('touchend', () => {
  panning = false;
  isPinching = false;
});


// Shortcut key control
document.addEventListener('keydown', async e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (editMode) saveState();
    else alert('편집 모드(Shift+E)를 활성화해야 저장할 수 있습니다.');
    return;
  }

  if (e.shiftKey && e.key.toUpperCase() === 'E') {
    if (!editMode) {
      const pw = prompt("편집 모드 비밀번호를 입력하세요:");
      if (pw === null) return;
      try {
        const res = await fetch('/api/check-edit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            password: pw
          })
        });
        if (res.ok) {
          editMode = true;
          document.body.classList.add('edit');
          document.querySelectorAll('.note-content').forEach(el => el.contentEditable = true);
          document.querySelectorAll('.photo-caption').forEach(el => el.contentEditable = true);
          alert('편집 모드가 활성화되었습니다.');
        } else {
          alert('비밀번호가 틀렸습니다.');
        }
      } catch (err) {
        alert('서버 연결에 실패했습니다.');
      }
    } else {
      exitEdit();
    }
  }

  if (e.key === 'Escape') exitEdit();
})

function exitEdit() {
  editMode = false;
  document.body.classList.remove('edit');
  document.querySelectorAll('.note-content').forEach(el => el.contentEditable = false);
  document.querySelectorAll('.photo-caption').forEach(el => el.contentEditable = false);
}

// Physical logic (drag, tape, rotation)
function makeDraggable(card) {
  let dragging = false,
    ox = 0,
    oy = 0;

  // 공통 시작 로직
  const startDrag = (clientX, clientY) => {
    zIdx++;
    card.style.zIndex = zIdx;
    card.dataset.z = zIdx;
    dragging = true;
    
    const currentLeft = parseFloat(card.style.left) || 0;
    const currentTop = parseFloat(card.style.top) || 0;

    const worldX = (clientX - vRef.x) / vRef.s;
    const worldY = (clientY - vRef.y) / vRef.s;

    ox = worldX - currentLeft;
    oy = worldY - currentTop;
  };

  const moveDrag = (clientX, clientY) => {
    if (dragging) {
      const worldX = (clientX - vRef.x) / vRef.s;
      const worldY = (clientY - vRef.y) / vRef.s;

      card.style.left = (worldX - ox) + 'px';
      card.style.top = (worldY - oy) + 'px';
    }
  };

  // 데스크톱 마우스 이벤트
  card.addEventListener('mousedown', e => {
    if (!editMode) return; // 편집모드가 아니면 리턴
    if (e.button !== 0 || e.target.contentEditable === 'true' || e.target.classList.contains('rotate-handle') || e.target.classList.contains('resize-handle')) return;
    e.stopPropagation();
    startDrag(e.clientX, e.clientY);
  });

  document.addEventListener('mousemove', e => {
    if (dragging) moveDrag(e.clientX, e.clientY);
  });

  document.addEventListener('mouseup', () => dragging = false);

  // 모바일 터치 이벤트
  card.addEventListener('touchstart', e => {
    if (!editMode) return; // 편집모드가 아니면 리턴
    if (e.target.contentEditable === 'true' || e.target.classList.contains('rotate-handle') || e.target.classList.contains('resize-handle')) return;
    e.stopPropagation();
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  }, {
    passive: false
  });

  document.addEventListener('touchmove', e => {
    if (dragging) {
      const touch = e.touches[0];
      moveDrag(touch.clientX, touch.clientY);
      e.preventDefault(); // 스크롤 방지
    }
  }, {
    passive: false
  });

  document.addEventListener('touchend', () => dragging = false);
}

function makeRotatable(card) {
	const handle = document.createElement('div');
	handle.className = 'rotate-handle';
	handle.innerHTML = '↻';
	card.appendChild(handle);

	let rotating = false;
	let startAngle = 0;
	let baseRot = 0;

	const getCenter = () => {
		const rect = card.getBoundingClientRect();
		return {
			x: rect.left + rect.width / 2,
			y: rect.top + rect.height / 2
		};
	};

	const startRotate = (clientX, clientY) => {
		rotating = true;
		const center = getCenter();
		
		const dx = clientX - center.x;
		const dy = clientY - center.y;
		startAngle = Math.atan2(dy, dx) * (180 / Math.PI);
		
		baseRot = parseFloat(card.dataset.rot || 0);
	};

	const moveRotate = (clientX, clientY) => {
		if (!rotating) return;
		const center = getCenter();
		
		const dx = clientX - center.x;
		const dy = clientY - center.y;
		const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
		
		let angleDiff = currentAngle - startAngle;
		let finalAngle = baseRot + angleDiff;

		card.style.transform = `rotate(${finalAngle}deg)`;
		card.dataset.rot = finalAngle;
	};

	handle.addEventListener('mousedown', e => {
		if (!editMode) return;
		e.stopPropagation();
		e.preventDefault();
		
		startRotate(e.clientX, e.clientY);

		const onMouseMove = (me) => moveRotate(me.clientX, me.clientY);
		const onMouseUp = () => {
			rotating = false;
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
		};
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
	});

	handle.addEventListener('touchstart', e => {
		if (!editMode) return;
		e.stopPropagation();
		e.preventDefault();
		
		const touch = e.touches[0];
		startRotate(touch.clientX, touch.clientY);

		const onTouchMove = (te) => {
			const t = te.touches[0];
			moveRotate(t.clientX, t.clientY);
		};
		const onTouchEnd = () => {
			rotating = false;
			document.removeEventListener('touchmove', onTouchMove);
			document.removeEventListener('touchend', onTouchEnd);
		};
		document.addEventListener('touchmove', onTouchMove, { passive: false });
		document.addEventListener('touchend', onTouchEnd);
	}, { passive: false });
}

function makeResizable(card) {
	const handle = document.createElement('div');
	handle.className = 'resize-handle';
	card.appendChild(handle);

	let resizing = false;
	let startW = 0, startX = 0;

	const startResize = (clientX) => {
		resizing = true;
		startW = parseFloat(card.style.width);
		startX = clientX;
	};

	const moveResize = (clientX) => {
		if (!resizing) return;
		
		const rot = parseFloat(card.dataset.rot || 0) * (Math.PI / 180);
		const dx = (clientX - startX) / vRef.s;
		const effectiveDx = dx * Math.cos(rot);
		const nw = Math.max(80, startW + effectiveDx);
		card.style.width = nw + 'px';
	};

	handle.addEventListener('mousedown', e => {
		if (!editMode) return;
		e.stopPropagation();
		e.preventDefault();
		startResize(e.clientX);

		const onMouseMove = (me) => moveResize(me.clientX);
		const onMouseUp = () => {
			resizing = false;
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
		};
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
	});

	handle.addEventListener('touchstart', e => {
		if (!editMode) return;
		e.stopPropagation();
		e.preventDefault();
		const touch = e.touches[0];
		startResize(touch.clientX);

		const onTouchMove = (te) => moveResize(te.touches[0].clientX);
		const onTouchEnd = () => {
			resizing = false;
			document.removeEventListener('touchmove', onTouchMove);
			document.removeEventListener('touchend', onTouchEnd);
		};
		document.addEventListener('touchmove', onTouchMove, { passive: false });
		document.addEventListener('touchend', onTouchEnd);
	}, { passive: false });
}

function makeTape(card) {
  const t = document.createElement('div');
  t.className = 'tape';
  const w = randInt(50, 80);
  t.style.width = w + 'px';
  t.style.height = '20px';
  t.style.top = '-10px';
  t.style.left = '50%';
  t.style.marginLeft = -(w / 2) + 'px';
  t.style.transform = `rotate(${rand(-3, 3)}deg)`;
  card.appendChild(t);
}

// Card Generation Logic
function createPhotoCard({
  x,
  y,
  rot,
  width,
  imageSrc,
  caption,
  bgColor,
  textColor,
  id,
  z
}) {
  const card = document.createElement('div');
  card.className = 'card photo-card'
  card.dataset.id = id || uid();
  card.dataset.type = 'photo';
  card.style.width = (width || 220) + 'px'

  const finalZ = z || ++zIdx;
  card.style.zIndex = finalZ;
  card.dataset.z = finalZ;
  if (finalZ > zIdx) zIdx = finalZ;

  // Apply Background Color
  if (bgColor) card.style.background = bgColor;

  const imgWrap = document.createElement('div');
  imgWrap.className = 'photo-img-wrap'
  if (imageSrc) {
    imgWrap.innerHTML = `<img src="${imageSrc}" draggable="false">`
  } else {
    imgWrap.innerHTML = `<div class="photo-placeholder"><span>+</span></div>`
  }

  const fileInput = document.createElement('input')
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none'
  fileInput.addEventListener('change', function() {
      const file = this.files[0];
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;

              const MAX_WIDTH = 800;
              if (width > MAX_WIDTH) {
                  height = Math.round((height * MAX_WIDTH) / width);
                  width = MAX_WIDTH;
              }

              canvas.width = width;
              canvas.height = height;

              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);

              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

              imgWrap.innerHTML = `<img src="${compressedBase64}" draggable="false">`
              imgWrap.appendChild(fileInput)
          };
          img.src = ev.target.result;
      }
      reader.readAsDataURL(file)
  })
  imgWrap.appendChild(fileInput)

  imgWrap.addEventListener('click', e => {
    if (!editMode) return
    e.stopPropagation()
    fileInput.click()
  })
  card.appendChild(imgWrap)

  const cap = document.createElement('div')
  cap.className = 'photo-caption'
  cap.contentEditable = editMode
  cap.textContent = caption || ''
  cap.dataset.placeholder = '캡션 입력...'

  // Apply text color
  if (textColor) cap.style.color = textColor;
  card.appendChild(cap)

  makeTape(card);
  const del = document.createElement('div');
  del.className = 'del-btn';
  del.textContent = '×';
  del.onclick = () => card.remove();
  card.appendChild(del);

  makeDraggable(card);
  makeRotatable(card);
  makeResizable(card);

  attachColorPanel(card, 'photo');
  enableCardUI(card);

  card.style.left = x + 'px';
  card.style.top = y + 'px';
  const r = rot !== undefined ? rot : rand(-10, 10);
  card.dataset.rot = r;
  card.style.transform = `rotate(${r}deg)`
  world.appendChild(card);
  return card
}

function createNoteCard({
  x,
  y,
  rot,
  width,
  noteText,
  noteColor,
  textColor,
  id,
  z
}) {
  const card = document.createElement('div');
  card.className = 'card note-card'
  card.dataset.id = id || uid();
  card.dataset.type = 'note';
  card.style.width = (width || 190) + 'px';

  // Apply Background Color
  card.style.background = noteColor || '#fef9c3'

  const finalZ = z || ++zIdx;
  card.style.zIndex = finalZ;
  card.dataset.z = finalZ;
  if (finalZ > zIdx) zIdx = finalZ;

  const content = document.createElement('div');
  content.className = 'note-content'
  content.contentEditable = editMode;
  content.textContent = noteText || '메모 입력'

  // Apply text color
  if (textColor) content.style.color = textColor;

  card.appendChild(content)
  makeTape(card);
  const del = document.createElement('div');
  del.className = 'del-btn';
  del.textContent = '×';
  del.onclick = () => card.remove();
  card.appendChild(del);

  makeDraggable(card);
  makeRotatable(card);
  makeResizable(card)

  attachColorPanel(card, 'note');
  enableCardUI(card);

  card.style.left = x + 'px';
  card.style.top = y + 'px';
  const r = rot !== undefined ? rot : rand(-8, 8);
  card.dataset.rot = r;
  card.style.transform = `rotate(${r}deg)`
  world.appendChild(card);
  return card
}

function attachColorPanel(card, type) {
  const panel = document.createElement('div');
  panel.className = 'color-panel';

  const bgPicker = document.createElement('input');
  bgPicker.type = 'color';

  const textPicker = document.createElement('input');
  textPicker.type = 'color';

  // Color Value Hex Conversion Utility
  const toHex = (colorStr) => {
    if (!colorStr) return null;
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = colorStr;
    return ctx.fillStyle; // Browser automatically returns it in #000000 format
  }

  // Initial Background Color Settings
  const currentBg = card.style.background;
  bgPicker.value = toHex(currentBg) || (type === 'note' ? '#fef9c3' : '#f4ede0');

  // Initial text color setting
  const targetTextEl = type === 'note' ? card.querySelector('.note-content') : card.querySelector('.photo-caption');
  if (targetTextEl) {
    textPicker.value = toHex(targetTextEl.style.color) || '#000000';
  }

  panel.appendChild(bgPicker);
  panel.appendChild(textPicker);
  card.appendChild(panel);

  // Change background color
  bgPicker.addEventListener('input', () => {
    card.style.background = bgPicker.value;
  });

  // Change text color
  textPicker.addEventListener('input', () => {
    if (targetTextEl) targetTextEl.style.color = textPicker.value;
  });
}

function enableCardUI(card) {
  // mouse click
  card.addEventListener('mousedown', (e) => {
    if (!editMode) return;
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    e.stopPropagation();
  });

  // Mobile Touch
  card.addEventListener('touchstart', (e) => {
    if (!editMode) return;
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    e.stopPropagation();
  }, {
    passive: true
  });
}

function renderCards(cards) {
  world.innerHTML = ''
  const sorted = [...cards].sort((a, b) => (a.z || 0) - (b.z || 0))
  sorted.forEach(c => {
    if (c.type === 'photo') createPhotoCard(c)
    else createNoteCard(c)
  })
  if (cards.length > 0) {
    zIdx = Math.max(...cards.map(c => c.z || 100)) + 1
  }
}

function collectCards() {
  const cards = []
  document.querySelectorAll('.card').forEach(card => {
    const type = card.dataset.type
    const base = {
      id: card.dataset.id,
      type,
      x: parseFloat(card.style.left),
      y: parseFloat(card.style.top),
      rot: parseFloat(card.dataset.rot || 0),
      width: parseFloat(card.style.width),
      z: parseInt(card.dataset.z || 100)
    }
    if (type === 'photo') {
      const img = card.querySelector('img')
      const cap = card.querySelector('.photo-caption')

      cards.push({
        ...base,
        imageSrc: img ? img.src : null,
        caption: cap ? cap.textContent : null,
        bgColor: card.style.background || null,
        textColor: cap ? cap.style.color : null
      })
    } else {
      const content = card.querySelector('.note-content')

      cards.push({
        ...base,
        noteColor: card.style.background,
        noteText: content.textContent,
        textColor: content.style.color || null
      })
    }
  })
  return cards
}

async function saveState() {
  const cards = collectCards()
  try {
    const res = await fetch('/api/save-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cards
      })
    })
    if (res.ok) {
      saveToLocalCache(cards)
      showToast('저장 완료!')
    } else throw new Error()
  } catch (err) {
    showToast('서버 저장 실패. 로컬에 저장됨.', true)
    saveToLocalCache(cards)
  }
}

window.addEventListener('load', async () => {
  const cached = loadFromLocalCache()
  if (cached?.cards?.length > 0) renderCards(cached.cards)
  if (cached?.view) applyView(cached.view.x, cached.view.y, cached.view.s)
  else resetView()

  if (!cached?.cards?.length) showLoading()
  try {
    const res = await fetch('/api/get-data')
    const state = await res.json()
    hideLoading()
    if (!state?.cards) return
    saveToLocalCache(state.cards)
    if (JSON.stringify(cached?.cards ?? []) !== JSON.stringify(state.cards)) {
      renderCards(state.cards)
    }
  } catch {
    hideLoading()
  }
})

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast')
  toast.textContent = msg
  toast.style.cssText = `
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
    background:${isError ? '#cc3333' : '#333'}; color:#fff;
    padding:8px 18px; border-radius:20px; font-size:13px;
    opacity:1; transition:opacity 0.4s; z-index:99999;
  `
  clearTimeout(toast._timer)
  toast._timer = setTimeout(() => {
    toast.style.opacity = 0
  }, 2200)
}

function addPhoto() {
  const c = worldCenter();
  createPhotoCard({
    x: c.x - 110,
    y: c.y - 110
  })
}

function addNote() {
  const c = worldCenter();
  createNoteCard({
    x: c.x - 95,
    y: c.y - 50,
    noteColor: NOTE_COLORS[randInt(0, NOTE_COLORS.length - 1)]
  })
}

function shuffleAll() {
  document.querySelectorAll('.card').forEach(card => {
    card.style.left = rand(500, 2500) + 'px';
    card.style.top = rand(500, 2500) + 'px'
  })
}

function resetView() {
  applyView(window.innerWidth / 2 - 1500, window.innerHeight / 2 - 1500, 1)
}