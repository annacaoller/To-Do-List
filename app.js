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


// Estado/Refs 

// estado em memória da aplicação (fonte da verdade)
let boardState = loadBoard();

// referências de elementos do DOM (templates e área do board)
const boardEl   = document.getElementById("board");
const listTpl   = document.getElementById("listTemplate");
const itemTpl   = document.getElementById("itemTemplate");
const addListBtn= document.getElementById("addListBtn");


// Renderização 

// (re)renderiza todas as listas no board
function renderBoard(){
  boardEl.innerHTML = "";                            // limpa o container
  boardState.lists.forEach(list => {                 // para cada lista do estado...
    boardEl.appendChild(renderList(list));           // ...renderiza e anexa ao DOM
  });
}

// renderiza uma lista (coluna) a partir do template
function renderList(list){
  const node = listTpl.content.firstElementChild.cloneNode(true); // clona o template
  node.dataset.listId = list.id;                                   // guarda o id da lista no DOM

  //  título da lista 
  const title = node.querySelector(".list-title");
  title.value = list.name;                                         // popula o valor atual
  title.addEventListener("keydown", e => {                         // Enter confirma edição
    if (e.key === "Enter") title.blur();
  });
  title.addEventListener("blur", () => {                           // onBlur salva o nome
    const val = title.value.trim() || "Lista sem nome";
    renameList(list.id, val);
  });

  //  botões do header 
  node.querySelector(".rename").addEventListener("click", () => title.select()); // foco no input
  node.querySelector(".delete-list").addEventListener("click", () => deleteList(list.id)); // excluir lista

  //  input de nova tarefa 
  const input = node.querySelector(".task-input");     // campo de texto
  const addBtn = node.querySelector(".add-task");      // botão "Adicionar"
  const listEl = node.querySelector(".todo-list");     // <ul> que conterá as tarefas
  const empty  = node.querySelector(".empty");         // mensagem de estado vazio

  // mostra/oculta o "Sem tarefas..." conforme quantidade
  function setEmptyVisible(){
    empty.hidden = list.tasks.length !== 0;
  }

  // adiciona tarefa ao clicar no botão
  addBtn.addEventListener("click", () => addTaskToList(list.id, input, listEl, setEmptyVisible));

  // adiciona tarefa ao pressionar Enter no input
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTaskToList(list.id, input, listEl, setEmptyVisible);
  });

  //  itens existentes 
  listEl.innerHTML = "";                                           // limpa a UL
  list.tasks.forEach(task => listEl.appendChild(renderItem(list.id, task))); // renderiza cada tarefa
  setEmptyVisible();                                               // atualiza estado vazio

  //  Drag & Drop na área da lista (drop em espaço vazio para mover entre listas) 
  node.addEventListener("dragover", (e) => onListDragOver(e, node));  // sinaliza alvo de drop
  node.addEventListener("dragleave", () => node.classList.remove("drag-over")); // remove highlight
  node.addEventListener("drop", (e) => onListDrop(e, list.id, listEl, setEmptyVisible, node)); // solta aqui

  return node;                                                     // retorna o nó pronto
}

// renderiza um item (tarefa) a partir do template
function renderItem(listId, task){
  const li = itemTpl.content.firstElementChild.cloneNode(true);    // clona <li> do template
  li.dataset.id = task.id;                                         // id da tarefa no DOM
  li.dataset.listId = listId;                                      // id da lista ao qual pertence

  const toggle = li.querySelector(".toggle");                      // botão de concluir
  const textEl = li.querySelector(".text");                        // span de texto

  // configura UI conforme o estado "done"
  if (task.done) {
    li.classList.add("completed");
    toggle.classList.add("done");
    toggle.title = "Desmarcar tarefa";
    toggle.setAttribute("aria-label","Desmarcar tarefa");
    toggle.textContent = "✓";
  } else {
    toggle.title = "Marcar como feita";
    toggle.setAttribute("aria-label","Marcar como feita");
    toggle.textContent = "";
  }

  textEl.textContent = task.text;                                  // texto da tarefa