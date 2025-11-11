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

    //  ações de item 
  li.querySelector(".edit").addEventListener("click", () => editTask(listId, task.id));       // editar (prompt)
  li.querySelector(".delete").addEventListener("click", () => deleteTask(listId, task.id));   // excluir
  toggle.addEventListener("click", () => toggleTask(listId, task.id));                        // alternar done

  //  Drag & Drop do item 
  li.addEventListener("dragstart", onDragStart);                    // começa a arrastar
  li.addEventListener("dragend", onDragEnd);                        // termina o arrasto

  // reordenação dentro da mesma lista: calcula posição relativa e insere antes/depois
  li.addEventListener("dragover", onItemDragOver);
  li.addEventListener("drop", (e) => onItemDrop(e, listId));        // drop sobre outro item

  return li;                                                        // retorna o <li> pronto
}


// Ações de Lista

// cria uma nova lista e a coloca à direita
function addNewList(){
  const newList = { id: uid(), name: "Nova lista", tasks: [] }; // objeto da nova lista
  boardState.lists.push(newList);                                // adiciona ao estado
  saveBoard(boardState);                                         // persiste

  // render incremental: só a nova lista
  boardEl.appendChild(renderList(newList));

  // foca no título da nova lista para renomear imediatamente
  const last = boardEl.querySelector(`.list[data-list-id="${newList.id}"] .list-title`);
  if (last) last.select();
}

// renomeia uma lista existente
function renameList(listId, newName){
  const list = boardState.lists.find(l => l.id === listId);      // acha a lista
  if (!list) return;                                             // não achou? nada a fazer
  list.name = newName;                                           // atualiza o nome
  saveBoard(boardState);                                         // persiste
}

// exclui uma lista (impede excluir a última)
function deleteList(listId){
  if (boardState.lists.length === 1){                            // única lista?
    alert("Mantenha ao menos uma lista.");
    return;
  }
  boardState.lists = boardState.lists.filter(l => l.id !== listId); // remove do estado
  saveBoard(boardState);                                            // persiste
  renderBoard();                                                     // re-render completo
}


//  Ações de Tarefa 

// cria uma tarefa na lista indicada; atualiza DOM e empty-state
function addTaskToList(listId, inputEl, listEl, setEmptyVisible){
  const raw = inputEl.value.trim();                          // texto digitado
  if (!raw){                                                 // vazio? feedback acessível
    inputEl.focus();
    inputEl.setAttribute("aria-invalid","true");
    inputEl.placeholder = "Digite algo primeiro…";
    return;
  }
  inputEl.removeAttribute("aria-invalid");                   // limpa erro visual

  const list = boardState.lists.find(l => l.id === listId);  // encontra a lista
  if (!list) return;

  const task = { id: uid(), text: raw, done: false };        // cria objeto tarefa
  list.tasks.push(task);                                     // adiciona ao estado
  saveBoard(boardState);                                     // persiste

  listEl.appendChild(renderItem(listId, task));              // adiciona no DOM
  inputEl.value = "";                                        // limpa input
  inputEl.focus();                                           // mantém foco para produtividade
  setEmptyVisible();                                         // atualiza estado vazio
}

// alterna o status "done" de uma tarefa e aplica no DOM
function toggleTask(listId, taskId){
  const list = boardState.lists.find(l => l.id === listId);  // encontra a lista
  if (!list) return;
  const t = list.tasks.find(t => t.id === taskId);           // encontra a tarefa
  if (!t) return;
  t.done = !t.done;                                          // alterna
  saveBoard(boardState);                                     // persiste

  const li = findItemEl(listId, taskId);                     // pega o <li> correspondente
  if (!li) return;
  li.classList.toggle("completed", t.done);                  // UI: linha concluída
  const toggle = li.querySelector(".toggle");                // UI: botão de done
  toggle.classList.toggle("done", t.done);
  toggle.title = t.done ? "Desmarcar tarefa" : "Marcar como feita";
  toggle.setAttribute("aria-label", toggle.title);
  toggle.textContent = t.done ? "✓" : "";
}

// edita o texto de uma tarefa (via prompt) e reflete no DOM
function editTask(listId, taskId){
  const list = boardState.lists.find(l => l.id === listId);
  if (!list) return;
  const t = list.tasks.find(t => t.id === taskId);
  if (!t) return;

  const next = prompt("Editar tarefa:", t.text);             // solicita novo texto
  if (next === null) return;                                 // cancelou
  const trimmed = next.trim();
  if (!trimmed) return;                                      // vazio? ignora

  t.text = trimmed;                                          // salva no estado
  saveBoard(boardState);                                     // persiste
  const liText = findItemEl(listId, taskId)?.querySelector(".text"); // atualiza no DOM
  if (liText) liText.textContent = trimmed;
}

// remove uma tarefa da lista e atualiza empty-state visualmente
function deleteTask(listId, taskId){
  const list = boardState.lists.find(l => l.id === listId);  // acha a lista
  if (!list) return;
  const idx = list.tasks.findIndex(t => t.id === taskId);    // acha índice da tarefa
  if (idx === -1) return;
  list.tasks.splice(idx,1);                                  // remove do estado
  saveBoard(boardState);                                     // persiste

  const li = findItemEl(listId, taskId);                     // pega o <li> da tarefa
  const listEl = li?.closest(".list");                       // seção da lista
  li?.remove();                                              // remove do DOM

  // atualizar mensagem "Sem tarefas..."
  const updated = boardState.lists.find(l => l.id === listId);
  const empty = listEl?.querySelector(".empty");
  if (empty) empty.hidden = (updated?.tasks.length ?? 0) !== 0;
}

// utilitário: obtém o elemento <li> correspondente a uma tarefa específica
function findItemEl(listId, taskId){
  return boardEl.querySelector(`.item[data-list-id="${listId}"][data-id="${taskId}"]`);
}


// Drag & Drop (itens) 

// dados do item atualmente arrastado (origem)
let dragData = /** @type {{listId:string, taskId:string} | null} */ (null);

// início do arrasto de um item
function onDragStart(e){
  const li = e.currentTarget;                                 // <li> arrastado
  li.classList.add("dragging");                               // marca visual
  const listId = li.dataset.listId;                           // id da lista de origem
  const taskId = li.dataset.id;                               // id da tarefa
  dragData = { listId, taskId };                              // guarda para o drop
  e.dataTransfer.effectAllowed = "move";                      // sugestão de efeito

  // Para Firefox: precisa sempre setar algum dataTransfer
  e.dataTransfer.setData("text/plain", JSON.stringify(dragData));
}

// fim do arrasto: limpa marcações e estado
function onDragEnd(e){
  e.currentTarget.classList.remove("dragging");
  dragData = null;
}

// ao arrastar sobre outro item da mesma UL: decide inserir antes ou depois
function onItemDragOver(e){
  e.preventDefault();                                         // necessário para permitir drop
  const overLi = e.currentTarget;                              // item sob o cursor
  const container = overLi.parentElement;                      // a UL
  const dragging = container.querySelector(".dragging");       // item que está sendo arrastado
  if (!dragging || dragging === overLi) return;

  // calcula metade da altura para decidir se solta antes ou depois
  const rect = overLi.getBoundingClientRect();
  const before = (e.clientY - rect.top) < rect.height / 2;
  container.insertBefore(dragging, before ? overLi : overLi.nextSibling);
}

// drop sobre outro item (mesma UL): confirma reordenação conforme a posição atual no DOM
function onItemDrop(e, targetListId){
  e.preventDefault();
  if (!dragData) return;

  const { listId: fromListId, taskId } = dragData;            // origem
  const targetUl = e.currentTarget.closest(".todo-list");     // UL alvo
  commitReorder(fromListId, targetListId, targetUl);          // aplica no estado
}

// Drop em área vazia da lista (fora de itens): permite mover entre listas
function onListDragOver(e, listEl){
  if (!dragData) return;
  e.preventDefault();
  listEl.classList.add("drag-over");                          // highlight da lista
}

// conclui o drop na lista (apêndice ao final se necessário) e atualiza empty-states
function onListDrop(e, targetListId, listUlEl, setEmptyVisible, listSectionEl){
  e.preventDefault();
  listSectionEl.classList.remove("drag-over");                // remove highlight
  if (!dragData) return;

  const { listId: fromListId } = dragData;                    // lista de origem

  // Se nenhum item “recebeu” o drop diretamente, anexamos o <li> arrastado ao final da UL alvo
  const dragging = document.querySelector(".item.dragging");
  if (dragging && dragging.parentElement !== listUlEl){
    listUlEl.appendChild(dragging);
  }

  // aplica a reordenação/movimentação no estado conforme a ordem atual do DOM
  commitReorder(fromListId, targetListId, listUlEl);

  // atualiza empty states de ambas as listas (origem e destino)
  const fromListEl = boardEl.querySelector(`.list[data-list-id="${fromListId}"]`);
  const fromEmpty = fromListEl?.querySelector(".empty");
  const toEmpty = listSectionEl.querySelector(".empty");
  if (fromEmpty){
    const fromList = boardState.lists.find(l => l.id === fromListId);
    fromEmpty.hidden = (fromList?.tasks.length ?? 0) !== 0;
  }
  if (toEmpty){
    const toList = boardState.lists.find(l => l.id === targetListId);
    toEmpty.hidden = (toList?.tasks.length ?? 0) !== 0;
  }
}

// consolida a nova ordem após drag & drop (entre listas ou dentro da mesma)
function commitReorder(fromListId, toListId, targetUl){
  // Reconstroi a ordem conforme DOM na lista alvo
  const toList = boardState.lists.find(l => l.id === toListId);
  if (!toList) return;

  // moveu ENTRE listas?
  if (fromListId !== toListId){
    const fromList = boardState.lists.find(l => l.id === fromListId);
    if (!fromList) return;

    const idx = fromList.tasks.findIndex(t => t.id === dragData.taskId);
    if (idx !== -1){
      const [moved] = fromList.tasks.splice(idx,1);           // retira da origem

      // posição alvo = índice do elemento no UL conforme a ordem atual dos <li>
      const idsInDom = [...targetUl.querySelectorAll(".item")].map(li => li.dataset.id);
      const newIndex = Math.max(0, idsInDom.indexOf(dragData.taskId));
      toList.tasks.splice(newIndex, 0, moved);                // insere no destino

      // atualiza data-listId no DOM do item movido (para coerência visual)
      const itemEl = targetUl.querySelector(`.item[data-id="${dragData.taskId}"]`);
      if (itemEl) itemEl.dataset.listId = toListId;
    }
  } else {
    // reordenação DENTRO da mesma lista: ordena array conforme ids exibidos no DOM
    const orderIds = [...targetUl.querySelectorAll(".item")].map(li => li.dataset.id);
    toList.tasks.sort((a,b) => orderIds.indexOf(a.id) - orderIds.indexOf(b.id));
  }

  saveBoard(boardState);                                       // persiste a nova ordem
}


//  Eventos globais

// botão global de criar nova lista
addListBtn.addEventListener("click", addNewList);


// Bootstrap 

// renderiza tudo na primeira carga
renderBoard();
