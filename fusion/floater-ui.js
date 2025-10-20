(() => {
  const S = () => window.RPGFusion?.loadSettings?.() || { dock:'right', floatersCollapsed:false };
  let root, header, grid;

  function mount(){
    if (document.getElementById('rpgfusion-root')) return;
    root = document.createElement('div');
    root.id = 'rpgfusion-root';
    root.className = `rpgfusion dock-${S().dock}`;
    root.innerHTML = `
      <div class="rf-header">
        <div class="rf-title">Fusion UI</div>
        <div class="rf-tools">
          <input class="rf-dice" placeholder="1d20+5"/>
          <button class="rf-roll">Roll</button>
          <button class="rf-collapse">${S().floatersCollapsed?'Expand':'Collapse'}</button>
        </div>
      </div>
      <div class="rf-grid"></div>
    `;
    document.body.appendChild(root);
    header = root.querySelector('.rf-header');
    grid = root.querySelector('.rf-grid');

    header.querySelector('.rf-roll').onclick = () => {
      const expr = header.querySelector('.rf-dice').value || '1d20';
      const r = window.RPGFusion.rollDice(expr); console.log('[Dice]', r.text);
    };
    header.querySelector('.rf-collapse').onclick = () => {
      const x = window.RPGFusion.loadSettings(); x.floatersCollapsed = !x.floatersCollapsed; window.RPGFusion.saveSettings(x); render();
    };

    render();
  }

  function applyDock(){
    root.classList.remove('dock-left','dock-right');
    root.classList.add(`dock-${S().dock}`);
  }

  function render(){
    applyDock();
    const collapsed = S().floatersCollapsed;
    grid.innerHTML = '';
    // simple fake floater to prove UI mounts
    const b = document.createElement('button');
    b.className = `rf-floater ${collapsed?'is-collapsed':''}`;
    b.textContent = 'Example Floater';
    grid.appendChild(b);
  }

  window.addEventListener('load', () => { mount(); });
  window.addEventListener('fusion/settings-updated', () => { applyDock(); render(); });
})();
