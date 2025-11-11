//  Persistência 

// chave única usada no localStorage para salvar o quadro
const STORAGE_KEY = "todo_board_v1";

/** @typedef {{ id:string, text:string, done:boolean }} Task */  // tipo de uma tarefa
/** @typedef {{ id:string, name:string, tasks:Task[] }} List */  // tipo de uma lista (coluna)
/** @typedef {{ lists: List[] }} Board */                         // tipo do board inteiro

// helper precisa vir antes de loadBoard(): gera um id curto pseudo-único
const uid = () => Math.random().toString(36).slice(2, 10);

// carrega o board do localStorage; se não existir, cria um estado inicial
function loadBoard(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);   // lê JSON salvo
    if (raw) return JSON.parse(raw);                 // se existir, parseia e retorna
  } catch {}                                         // falhou? ignora e cai no estado inicial

  // estado inicial com uma lista vazia
  return {
    lists: [{
      id: uid(),
      name: "Minha lista",
      tasks: []
    }]
  };
}

// salva o estado atual no localStorage
function saveBoard(board){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
}
