(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);

  // ===== EDITAR AQUI =====
  const WHATSAPP = "5581900000000";            // número da Morgana, com 55 + DDD
  const ABRE = 9 * 60, FECHA = 18 * 60;         // expediente (minutos)
  const ALMOCO = [12 * 60, 13 * 60];            // pausa
  const PASSO = 30;                             // intervalo entre horários
  const DIAS_FECHADOS = [0, 1];                 // 0=domingo, 1=segunda
  const SERVICOS = [
    { id: "micro", nome: "Micropigmentação de sobrancelhas", min: 150, preco: 450, desc: "Fio a fio ou sombreado, com anestesia tópica." },
    { id: "labios", nome: "Micropigmentação labial", min: 150, preco: 500, desc: "Contorno e cor para os lábios." },
    { id: "retoque", nome: "Retoque (até 60 dias)", min: 90, preco: 150, desc: "Ajuste de cor e fios após a cicatrização." },
    { id: "design", nome: "Design de sobrancelhas", min: 45, preco: 60, desc: "Desenho e limpeza com henna opcional." },
    { id: "limpeza", nome: "Limpeza de pele", min: 60, preco: 120, desc: "Higienização profunda e hidratação." },
  ];
  // =======================

  const CHAVE = "demo-agenda-v1";
  const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const deIso = (s) => new Date(s + "T12:00:00");
  const longo = (s) => deIso(s).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const dur = (m) => (m % 60 ? `${Math.floor(m / 60) ? Math.floor(m / 60) + " h " : ""}${m % 60} min` : `${m / 60} h`);
  const servico = (id) => SERVICOS.find((s) => s.id === id);

  // ---- armazenamento (só neste aparelho; na versão real vai para o banco online) ----
  const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || []; } catch { return []; } };
  const gravar = (l) => { try { localStorage.setItem(CHAVE, JSON.stringify(l)); } catch {} };

  // agendamentos de exemplo, para a agenda já parecer "viva"
  function exemplos(dia) {
    const d = deIso(dia), w = d.getDay();
    if (DIAS_FECHADOS.includes(w)) return [];
    const sem = d.getDate() + w;
    const nomes = ["Camila R.", "Juliana S.", "Patrícia L.", "Renata A.", "Bianca M.", "Fernanda C."];
    const base = [
      { ini: 9 * 60, s: "design" }, { ini: 10 * 60, s: "limpeza" },
      { ini: 13 * 60, s: "micro" }, { ini: 14 * 60 + 30, s: "retoque" }, { ini: 16 * 60, s: "design" },
    ];
    return base.filter((_, i) => (sem + i * 3) % 5 < 1).map((b, i) => ({
      id: `ex-${dia}-${b.ini}`, data: dia, ini: b.ini, servico: b.s, min: servico(b.s).min,
      nome: nomes[(sem + i) % nomes.length], tel: "", exemplo: true,
    }));
  }
  const doDia = (dia) => [...exemplos(dia), ...ler().filter((a) => a.data === dia)].sort((a, b) => a.ini - b.ini);

  function livres(dia, min) {
    if (DIAS_FECHADOS.includes(deIso(dia).getDay())) return [];
    const ocup = doDia(dia).map((a) => [a.ini, a.ini + a.min]);
    ocup.push(ALMOCO);
    const agora = new Date(), hojeStr = iso(agora), minAgora = agora.getHours() * 60 + agora.getMinutes() + 60;
    const r = [];
    for (let t = ABRE; t + min <= FECHA; t += PASSO) {
      if (dia === hojeStr && t < minAgora) continue;
      if (ocup.every(([a, b]) => t + min <= a || t >= b)) r.push(t);
    }
    return r;
  }

  // ---- cliente ----
  let sel = { servico: null, dia: null, hora: null };
  const mostrar = (...ids) => ["p1", "p2", "p3", "p4"].forEach((p) => { $("#" + p).hidden = !ids.includes(p); });

  function desenharServicos() {
    const box = $("#servicos"); box.textContent = "";
    SERVICOS.forEach((s) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "servico"; b.setAttribute("aria-pressed", String(sel.servico === s.id));
      b.innerHTML = `<b></b><span class="preco"></span><small></small>`;
      b.children[0].textContent = s.nome; b.children[1].textContent = brl(s.preco); b.children[2].textContent = `${dur(s.min)} · ${s.desc}`;
      b.addEventListener("click", () => { sel = { servico: s.id, dia: null, hora: null }; desenharServicos(); desenharDias(); mostrar("p1", "p2"); $("#p2").scrollIntoView({ behavior: "smooth", block: "start" }); });
      box.append(b);
    });
  }

  function desenharDias() {
    const box = $("#dias"); box.textContent = "";
    const s = servico(sel.servico);
    const hoje = new Date(); let primeiro = null;
    for (let i = 0; i < 21; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i, 12), k = iso(d);
      const tem = livres(k, s.min).length > 0;
      const b = document.createElement("button"); b.type = "button"; b.className = "dia"; b.disabled = !tem; b.setAttribute("role", "option");
      b.setAttribute("aria-selected", String(sel.dia === k));
      b.innerHTML = `<span></span><strong></strong>`;
      b.children[0].textContent = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""); b.children[1].textContent = d.getDate();
      b.setAttribute("aria-label", longo(k) + (tem ? "" : ", sem horários"));
      b.addEventListener("click", () => { sel.dia = k; sel.hora = null; desenharDias(); desenharHoras(); });
      box.append(b); if (tem && !primeiro) primeiro = k;
    }
    $("#notaHoras").textContent = "Dias cinza não têm horário livre para esse procedimento.";
    $("#horas").textContent = "";
  }

  function desenharHoras() {
    const s = servico(sel.servico), box = $("#horas"); box.textContent = "";
    const l = livres(sel.dia, s.min);
    $("#notaHoras").textContent = `${longo(sel.dia)} · ${s.nome} (${dur(s.min)})`;
    if (!l.length) { const p = document.createElement("p"); p.className = "vazio"; p.textContent = "Sem horários livres neste dia. Escolha outro."; box.append(p); return; }
    l.forEach((t) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "hora"; b.textContent = hm(t);
      b.addEventListener("click", () => { sel.hora = t; resumo(); mostrar("p1", "p2", "p3"); $("#p3").scrollIntoView({ behavior: "smooth", block: "start" }); $("#nome").focus({ preventScroll: true }); });
      box.append(b);
    });
  }

  function resumo() {
    const s = servico(sel.servico);
    $("#resumo").innerHTML = `<b></b><span></span>`;
    $("#resumo").children[0].textContent = s.nome;
    $("#resumo").children[1].textContent = `${longo(sel.dia)}, ${hm(sel.hora)} às ${hm(sel.hora + s.min)} · ${brl(s.preco)}`;
  }

  $("#fDados").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const nome = $("#nome").value.trim(), tel = $("#tel").value.replace(/\D/g, "");
    if (nome.length < 2) { $("#erro").textContent = "Digite seu nome."; return; }
    if (tel.length < 10 || tel.length > 11) { $("#erro").textContent = "Digite o WhatsApp com DDD, por exemplo (81) 90000-0000."; return; }
    const s = servico(sel.servico);
    if (!livres(sel.dia, s.min).includes(sel.hora)) { $("#erro").textContent = "Esse horário acabou de ser ocupado. Escolha outro."; desenharDias(); desenharHoras(); mostrar("p1", "p2"); return; }
    $("#erro").textContent = "";
    const l = ler(); l.push({ id: String(Date.now()), data: sel.dia, ini: sel.hora, servico: s.id, min: s.min, nome, tel }); gravar(l);
    $("#okTexto").textContent = `${s.nome}, ${longo(sel.dia)} às ${hm(sel.hora)}. Esse horário já saiu da agenda para as outras clientes.`;
    const msg = `Olá, Morgana! Sou ${nome} e acabei de agendar: ${s.nome}, ${longo(sel.dia)} às ${hm(sel.hora)}.`;
    $("#okZap").href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
    mostrar("p4"); window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("#novo").addEventListener("click", () => { sel = { servico: null, dia: null, hora: null }; $("#fDados").reset(); desenharServicos(); mostrar("p1"); window.scrollTo({ top: 0, behavior: "smooth" }); });

  // ---- painel da Morgana ----
  let diaPainel = iso(new Date());
  function desenharPainel() {
    const tt = longo(diaPainel); $("#diaTitulo").textContent = tt.charAt(0).toUpperCase() + tt.slice(1);
    const lista = doDia(diaPainel), ol = $("#agenda"); ol.textContent = "";
    const fechado = DIAS_FECHADOS.includes(deIso(diaPainel).getDay());
    const horas = lista.reduce((t, a) => t + a.min, 0), receita = lista.reduce((t, a) => t + servico(a.servico).preco, 0);
    $("#metricas").innerHTML = `<div><b>${lista.length}</b><span>atendimentos</span></div><div><b>${fechado ? "–" : dur(Math.max(0, (FECHA - ABRE - (ALMOCO[1] - ALMOCO[0])) - horas))}</b><span>livres</span></div><div><b>${brl(receita)}</b><span>previsto</span></div>`;
    if (fechado) { ol.innerHTML = `<li class="item livre">Sem atendimento neste dia.</li>`; return; }
    if (!lista.length) { ol.innerHTML = `<li class="item livre">Nenhum atendimento marcado. Dia todo livre.</li>`; return; }
    lista.forEach((a) => {
      const s = servico(a.servico), li = document.createElement("li"); li.className = "item";
      li.innerHTML = `<span class="hr"></span><strong></strong><span class="tag"></span><div class="acoes"></div>`;
      li.children[0].textContent = `${hm(a.ini)} às ${hm(a.ini + a.min)}`;
      li.children[1].textContent = `${a.nome} · ${s.nome}`;
      li.children[2].textContent = a.exemplo ? "exemplo" : "agendado agora";
      const ac = li.children[3];
      if (!a.exemplo) {
        const z = document.createElement("a"); z.className = "btn zap"; z.target = "_blank"; z.rel = "noopener";
        z.textContent = "Enviar lembrete";
        z.href = `https://wa.me/55${a.tel}?text=${encodeURIComponent(`Oi, ${a.nome.split(" ")[0]}! Passando para lembrar do seu horário: ${s.nome}, ${longo(a.data)} às ${hm(a.ini)}. Se não puder vir, me avise com antecedência para eu liberar o horário. Até lá!`)}`;
        const c = document.createElement("button"); c.type = "button"; c.className = "btn sec"; c.textContent = "Cancelar";
        c.addEventListener("click", () => { if (confirm("Cancelar este atendimento? O horário volta a ficar livre.")) { gravar(ler().filter((x) => x.id !== a.id)); desenharPainel(); } });
        ac.append(z, c);
      } else ac.remove();
      ol.append(li);
    });
  }
  $("#diaAnt").addEventListener("click", () => { const d = deIso(diaPainel); d.setDate(d.getDate() - 1); diaPainel = iso(d); desenharPainel(); });
  $("#diaProx").addEventListener("click", () => { const d = deIso(diaPainel); d.setDate(d.getDate() + 1); diaPainel = iso(d); desenharPainel(); });
  $("#zerar").addEventListener("click", () => { if (confirm("Apagar os agendamentos feitos nesta demonstração?")) { gravar([]); desenharPainel(); } });

  // ---- abas ----
  function aba(painel) {
    $("#vCliente").hidden = painel; $("#vPainel").hidden = !painel;
    $("#abaCliente").setAttribute("aria-pressed", String(!painel)); $("#abaPainel").setAttribute("aria-pressed", String(painel));
    if (painel) desenharPainel(); else { desenharServicos(); if (sel.servico) desenharDias(); }
  }
  $("#abaCliente").addEventListener("click", () => aba(false));
  $("#abaPainel").addEventListener("click", () => aba(true));

  desenharServicos();
})();
