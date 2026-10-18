const CONFIG_DIFICULDADE = {
  facil:   { max: 50,  vidas: 10, rotulo: '1 e 50',  nome: 'Fácil' },
  medio:   { max: 100, vidas: 7,  rotulo: '1 e 100', nome: 'Médio' },
  dificil: { max: 500, vidas: 5,  rotulo: '1 e 500', nome: 'Difícil' }
};

let dificuldadeAtual = 'medio';
let numeroSecreto = 0;
let vidasRestantes = 0;
let tentativas = 0;
let historico = [];
let jogoFinalizado = false;
let somAtivado = true;

const inputPalpite = document.getElementById('inputPalpite');
const btnChutar = document.getElementById('btnChutar');
const painelMensagem = document.getElementById('painelMensagem');
const textoMensagem = document.getElementById('textoMensagem');
const displayVidas = document.getElementById('displayVidas');
const displayRecorde = document.getElementById('displayRecorde');
const contadorTentativas = document.getElementById('contadorTentativas');
const secaoHistorico = document.getElementById('secaoHistorico');
const listaPalpites = document.getElementById('listaPalpites');
const qtdHistorico = document.getElementById('qtdHistorico');
const btnReiniciar = document.getElementById('btnReiniciar');
const btnSom = document.getElementById('btnSom');
const descricaoDificuldade = document.getElementById('descricaoDificuldade');
const botoesDificuldade = document.querySelectorAll('.btn-dif');
const painelCompartilhar = document.getElementById('painelCompartilhar');
const btnCompartilhar = document.getElementById('btnCompartilhar');
const avisoCopiado = document.getElementById('avisoCopiado');
const cartaoJogo = document.querySelector('.cartao-jogo');
const canvasConfete = document.getElementById('canvasConfete');

// Confetes na Vitória
let animConfeteId = null;
let confetes = [];

function dispararConfetes() {
  const ctx = canvasConfete.getContext('2d');
  canvasConfete.width = window.innerWidth;
  canvasConfete.height = window.innerHeight;

  const cores = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];
  confetes = [];

  for (let i = 0; i < 90; i++) {
    confetes.push({
      x: Math.random() * canvasConfete.width,
      y: Math.random() * canvasConfete.height * 0.3 - 50,
      r: Math.random() * 6 + 4,
      cor: cores[Math.floor(Math.random() * cores.length)],
      vx: Math.random() * 4 - 2,
      vy: Math.random() * 3 + 3,
      rotacao: Math.random() * 360,
      vRotacao: Math.random() * 10 - 5
    });
  }

  const inicio = Date.now();

  function animar() {
    ctx.clearRect(0, 0, canvasConfete.width, canvasConfete.height);
    const decorrido = Date.now() - inicio;

    confetes.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rotacao += p.vRotacao;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotacao * Math.PI) / 180);
      ctx.fillStyle = p.cor;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.5);
      ctx.restore();
    });

    if (decorrido < 3500) {
      animConfeteId = requestAnimationFrame(animar);
    } else {
      ctx.clearRect(0, 0, canvasConfete.width, canvasConfete.height);
    }
  }

  cancelAnimationFrame(animConfeteId);
  animar();
}

// Áudio Sintetizado Web Audio
let audioCtx = null;

function tocarTom(frequencia, tipoOnda, duracao, delay = 0) {
  if (!somAtivado) return;

  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const tempoInicio = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const ganho = audioCtx.createGain();

    osc.type = tipoOnda;
    osc.frequency.setValueAtTime(frequencia, tempoInicio);

    ganho.gain.setValueAtTime(0.15, tempoInicio);
    ganho.gain.exponentialRampToValueAtTime(0.001, tempoInicio + duracao);

    osc.connect(ganho);
    ganho.connect(audioCtx.destination);

    osc.start(tempoInicio);
    osc.stop(tempoInicio + duracao);
  } catch (e) {}
}

function tocarSom(tipo) {
  if (tipo === 'dica') {
    tocarTom(440, 'sine', 0.1);
  } else if (tipo === 'erro') {
    tocarTom(220, 'triangle', 0.25);
  } else if (tipo === 'vitoria') {
    tocarTom(523.25, 'triangle', 0.15, 0.0);
    tocarTom(659.25, 'triangle', 0.15, 0.15);
    tocarTom(783.99, 'triangle', 0.15, 0.30);
    tocarTom(1046.50, 'triangle', 0.35, 0.45);
  } else if (tipo === 'derrota') {
    tocarTom(300, 'sawtooth', 0.2, 0.0);
    tocarTom(250, 'sawtooth', 0.2, 0.2);
    tocarTom(180, 'sawtooth', 0.4, 0.4);
  }
}

function acionarTremor() {
  cartaoJogo.classList.remove('tremer');
  void cartaoJogo.offsetWidth;
  cartaoJogo.classList.add('tremer');
}

// Recordes
function obterChaveRecorde() {
  return `recorde_adivinhacao_${dificuldadeAtual}`;
}

function carregarRecorde() {
  try {
    const recordeSalvo = localStorage.getItem(obterChaveRecorde());
    displayRecorde.textContent = recordeSalvo ? `${recordeSalvo} tentativa(s)` : '--';
  } catch (e) {
    displayRecorde.textContent = '--';
  }
}

function salvarRecordeSeMelhor(totalTentativas) {
  try {
    const chave = obterChaveRecorde();
    const anterior = localStorage.getItem(chave);

    if (!anterior || totalTentativas < parseInt(anterior, 10)) {
      localStorage.setItem(chave, totalTentativas);
      displayRecorde.textContent = `${totalTentativas} tentativa(s) 🌟 NOVO!`;
      return true;
    }
  } catch (e) {}
  return false;
}

function iniciarJogo() {
  const config = CONFIG_DIFICULDADE[dificuldadeAtual];
  numeroSecreto = Math.floor(Math.random() * config.max) + 1;
  vidasRestantes = config.vidas;
  tentativas = 0;
  historico = [];
  jogoFinalizado = false;

  contadorTentativas.textContent = '0';
  qtdHistorico.textContent = '0';
  listaPalpites.innerHTML = '';
  painelMensagem.className = 'painel-mensagem oculta';
  secaoHistorico.classList.add('oculta');
  painelCompartilhar.classList.add('oculta');
  avisoCopiado.classList.add('oculta');
  inputPalpite.value = '';
  inputPalpite.placeholder = `Ex: ${Math.floor(config.max / 2)}`;
  inputPalpite.max = config.max;
  descricaoDificuldade.innerHTML = `Pensei em um número entre <strong>${config.rotulo}</strong>.`;

  btnChutar.disabled = false;
  atualizarDisplayVidas();
  carregarRecorde();
  inputPalpite.focus();
}

function atualizarDisplayVidas() {
  const total = CONFIG_DIFICULDADE[dificuldadeAtual].vidas;
  let icones = '';
  for (let i = 0; i < total; i++) {
    icones += (i < vidasRestantes) ? '❤️' : '🖤';
  }
  displayVidas.textContent = icones;
}

function processarPalpite() {
  if (jogoFinalizado) return;

  const config = CONFIG_DIFICULDADE[dificuldadeAtual];
  const valor = parseInt(inputPalpite.value, 10);

  if (isNaN(valor) || valor < 1 || valor > config.max) {
    exibirMensagem(`Por favor, digite um número válido entre 1 e ${config.max}.`, 'aviso');
    tocarSom('erro');
    acionarTremor();
    return;
  }

  if (historico.some(item => item.valor === valor)) {
    exibirMensagem(`Você já tentou o número ${valor}! Escolha outro.`, 'aviso');
    tocarSom('erro');
    acionarTremor();
    return;
  }

  tentativas++;
  vidasRestantes--;
  contadorTentativas.textContent = tentativas;
  atualizarDisplayVidas();

  const distancia = Math.abs(numeroSecreto - valor);
  let termometro = '';
  if (distancia <= Math.max(3, Math.floor(config.max * 0.05))) {
    termometro = '🔥 Pelando de quente!';
  } else if (distancia <= Math.floor(config.max * 0.15)) {
    termometro = '☀️ Quente!';
  } else if (distancia <= Math.floor(config.max * 0.3)) {
    termometro = '🌤️ Morno.';
  } else {
    termometro = '❄️ Frio!';
  }

  if (valor === numeroSecreto) {
    const bateuRecorde = salvarRecordeSeMelhor(tentativas);
    const textoExtra = bateuRecorde ? ' 🌟 NOVO RECORDE REGISTRADO!' : '';
    exibirMensagem(`🎉 Parabéns! Você acertou o número ${numeroSecreto} em ${tentativas} tentativa(s)!${textoExtra}`, 'sucesso');
    adicionarAoHistorico(valor, 'acerto');
    tocarSom('vitoria');
    dispararConfetes();
    painelCompartilhar.classList.remove('oculta');
    finalizarJogo();
  } else {
    const dicaDirecao = valor < numeroSecreto ? 'MAIOR' : 'MENOR';
    const tipoDica = valor < numeroSecreto ? 'maior' : 'menor';
    adicionarAoHistorico(valor, tipoDica);

    if (vidasRestantes <= 0) {
      exibirMensagem(`💀 Fim de Jogo! Suas vidas acabaram. O número secreto era ${numeroSecreto}.`, 'erro');
      tocarSom('derrota');
      acionarTremor();
      finalizarJogo();
    } else {
      exibirMensagem(`📈 O número secreto é ${dicaDirecao} que ${valor}. (${termometro})`, 'dica');
      tocarSom('dica');
    }
  }

  inputPalpite.value = '';
  inputPalpite.focus();
}

function adicionarAoHistorico(valor, tipo) {
  historico.push({ valor, tipo });
  secaoHistorico.classList.remove('oculta');
  qtdHistorico.textContent = historico.length;

  const tag = document.createElement('span');
  tag.className = `tag-palpite ${tipo}`;

  if (tipo === 'acerto') {
    tag.textContent = `🎯 ${valor}`;
  } else if (tipo === 'maior') {
    tag.textContent = `${valor} ⬆️`;
  } else {
    tag.textContent = `${valor} ⬇️`;
  }

  listaPalpites.appendChild(tag);
}

function exibirMensagem(texto, tipo) {
  painelMensagem.className = `painel-mensagem ${tipo}`;
  textoMensagem.textContent = texto;
}

function finalizarJogo() {
  jogoFinalizado = true;
  btnChutar.disabled = true;
}

btnCompartilhar.addEventListener('click', () => {
  const config = CONFIG_DIFICULDADE[dificuldadeAtual];
  const texto = `🎯 Joguei Adivinhe o Número!\nModo: ${config.nome} (1 a ${config.max})\nAcertei em: ${tentativas} tentativa(s)!\nVidas restantes: ${displayVidas.textContent}\nConsegue bater meu recorde? 😉`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(() => {
      avisoCopiado.classList.remove('oculta');
    }).catch(() => {
      copiarFallback(texto);
    });
  } else {
    copiarFallback(texto);
  }
});

function copiarFallback(texto) {
  const area = document.createElement('textarea');
  area.value = texto;
  document.body.appendChild(area);
  area.select();
  try {
    document.execCommand('copy');
    avisoCopiado.classList.remove('oculta');
  } catch (e) {}
  document.body.removeChild(area);
}

btnSom.addEventListener('click', () => {
  somAtivado = !somAtivado;
  btnSom.textContent = somAtivado ? '🔊' : '🔇';
  btnSom.title = somAtivado ? 'Som ativado' : 'Som desativado';
});

botoesDificuldade.forEach(botao => {
  botao.addEventListener('click', () => {
    botoesDificuldade.forEach(b => b.classList.remove('ativa'));
    botao.classList.add('ativa');
    dificuldadeAtual = botao.dataset.dif;
    iniciarJogo();
  });
});

btnChutar.addEventListener('click', processarPalpite);
btnReiniciar.addEventListener('click', iniciarJogo);

inputPalpite.addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter') {
    processarPalpite();
  }
});

window.addEventListener('resize', () => {
  if (canvasConfete) {
    canvasConfete.width = window.innerWidth;
    canvasConfete.height = window.innerHeight;
  }
});

iniciarJogo();