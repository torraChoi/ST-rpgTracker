(() => {
  const SKEY = `rpgFusion.settings.v1`;
  const TKEY = `rpgFusion.themes.v1`;
  const AKEY = `rpgFusion.theme.active`;

  const defaults = { dock: 'right', showThoughts: true, floatersCollapsed: false, theme: 'Fusion Default' };
  const builtinThemes = {
    'Fusion Default': { vars:{ bg:'#0f172a', panel:'#111827', accent:'#2563eb', accent2:'#06b6d4', text:'#e5e7eb', dim:'#9ca3af', card:'#0b1221', pill:'#1f2937', danger:'#ef4444', success:'#22c55e', border:'#1f2937' } }
  };

  function loadSettings(){ try { return { ...defaults, ...(JSON.parse(localStorage.getItem(SKEY)||'{}')) }; } catch { return { ...defaults }; } }
  function saveSettings(s){ localStorage.setItem(SKEY, JSON.stringify(s)); window.dispatchEvent(new CustomEvent('fusion/settings-updated', { detail: s })); }

  function loadThemes(){ let t={}; try{ t = JSON.parse(localStorage.getItem(TKEY)||'{}'); }catch{}; t={...builtinThemes,...t}; localStorage.setItem(TKEY, JSON.stringify(t)); return t; }
  function getActiveTheme(){ return localStorage.getItem(AKEY)||defaults.theme; }
  function applyTheme(name){ const t=loadThemes(); const th=t[name]||t[defaults.theme]; const root=document.documentElement.style; for(const k in th.vars) root.setProperty(`--ft-${k}`, th.vars[k]); localStorage.setItem(AKEY,name); window.dispatchEvent(new Event('fusion/theme-updated')); }

  function rollDice(expr){
    const m = String(expr).trim().match(/^(\d*)d(\d+)([+-]\d+)?$/i); if(!m) return { ok:false, text:'Invalid dice' };
    const c=Number(m[1]||1), s=Number(m[2]), mod=Number(m[3]||0); let tot=0, rolls=[]; for(let i=0;i<c;i++){ const r=1+Math.floor(Math.random()*s); tot+=r; rolls.push(r); } tot+=mod;
    return { ok:true, text:`Rolled ${c}d${s}${mod? (mod>0?`+${mod}`:mod) : ''}: [${rolls.join(', ')}] = ${tot}`, total:tot, rolls };
  }

  window.RPGFusion = { loadSettings, saveSettings, loadThemes, applyTheme, getActiveTheme, rollDice };

  window.addEventListener('load', () => applyTheme(getActiveTheme()));
})();
