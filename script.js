import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBBB_BFNUYlzZsVpXniG0vi6ZxKycIpiy0",
    authDomain: "sinistros-v2.firebaseapp.com",
    projectId: "sinistros-v2",
    storageBucket: "sinistros-v2.appspot.com",
    messagingSenderId: "612285174908",
    appId: "1:612285174908:web:3fc2a7b5ca60f5e86725f9",
    measurementId: "G-3H9YYXS1ZJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', function () {
    const addSinistroForm = document.getElementById('addSinistroForm');
    const modal = document.getElementById('modal');
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementsByClassName('close')[0];
    const sinistrosList = document.getElementById('sinistros-list').getElementsByTagName('tbody')[0];
    const timelineContainer = document.getElementById('timeline-container');
    const timeline = document.getElementById('timeline');

    let sinistros = [];
    let countdownInterval = null;

    openModalBtn.addEventListener('click', function () {
        modal.style.display = 'block';
    });

    closeModalBtn.addEventListener('click', function () {
        modal.style.display = 'none';
    });

    window.addEventListener('click', function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    addSinistroForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const dataLancamento = new Date();
        const prazoFinalDate = new Date(dataLancamento.getTime() + 3 * 24 * 60 * 60 * 1000); // Prazo final em 3 dias
        const prazoFinal = prazoFinalDate.toLocaleDateString();

        const newSinistro = {
            numeroSinistro: document.getElementById('numeroSinistro').value,
            tipoSinistro: document.getElementById('tipoSinistro').value,
            segurado: document.getElementById('segurado').value,
            cpf: document.getElementById('cpf').value,
            placa: document.getElementById('placa').value,
            terceiro: document.getElementById('terceiro').value,
            status: document.getElementById('status').value,
            prazoFinal: prazoFinal
        };

        try {
            const docRef = await addDoc(collection(db, 'sinistros'), newSinistro);
            newSinistro.id = docRef.id;
            sinistros.push(newSinistro);
            addSinistroToTable(newSinistro);
            modal.style.display = 'none';
            addSinistroForm.reset();
            enviarEmailNovoSinistro(newSinistro);
        } catch (error) {
            console.error("Erro ao adicionar sinistro: ", error);
        }
    });

    function addSinistroToTable(sinistro) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sinistro.numeroSinistro}</td>
            <td>${sinistro.tipoSinistro}</td>
            <td>${sinistro.segurado}</td>
            <td>${sinistro.cpf}</td>
            <td>${sinistro.placa}</td>
            <td>${sinistro.terceiro}</td>
            <td><select class="status-dropdown">
                    <option value="1.1 - Comunicação com seguradora (Gerando nº de sinistro)">1.1 - Comunicação com seguradora (Gerando nº de sinistro)</option>
                    <option value="1.2 - Solicitação de reboque para oficina ou residência">1.2 - Solicitação de reboque para oficina ou residência</option>
                    <option value="1.3 - Agendamento de vistoria">1.3 - Agendamento de vistoria</option>
                    <option value="1.4 - Solicitação de documentos de sinistro">1.4 - Solicitação de documentos de sinistro</option>
                    <option value="1.5 - Análise de documentos">1.5 - Análise de documentos</option>
                    <option value="1.6 - Autorização para orçamento">1.6 - Autorização para orçamento</option>
                    <option value="1.7 - Aprovação do orçamento">1.7 - Aprovação do orçamento</option>
                    <option value="1.8 - Abertura do pedido de peças">1.8 - Abertura do pedido de peças</option>
                    <option value="1.9 - Análise da peça">1.9 - Análise da peça</option>
                    <option value="1.10 - Correção de itens pendentes">1.10 - Correção de itens pendentes</option>
                    <option value="1.11 - Liberação do veículo">1.11 - Liberação do veículo</option>
                </select>
            </td>
            <td>${sinistro.prazoFinal}</td>
            <td>
                <button class="view-timeline">Ver Linha do Tempo</button>
                <button class="delete-sinistro" data-id="${sinistro.id}">Excluir</button>
            </td>
        `;
        sinistrosList.appendChild(row);

        const viewTimelineBtn = row.querySelector('.view-timeline');
        const deleteSinistroBtn = row.querySelector('.delete-sinistro');
        const statusDropdown = row.querySelector('.status-dropdown');
        statusDropdown.value = sinistro.status;

        viewTimelineBtn.addEventListener('click', function () {
            const status = statusDropdown.value;
            toggleTimeline(status, row, viewTimelineBtn);
            const stepDiv = timeline.querySelector(`.step:contains(${status})`);
            if (stepDiv) {
                updateStepAndStatus(stepDiv, row);
            }
        });
        deleteSinistroBtn.addEventListener('click', function () {
            confirmDeleteSinistro(sinistro.id, row);
        });
        statusDropdown.addEventListener('change', function () {
            const stepDiv = timeline.querySelector(`.step:contains(${statusDropdown.value})`);
            if (stepDiv) {
                updateStepAndStatus(stepDiv, row);
            }
        });
    }

    function toggleTimeline(status, row, button) {
        const isTimelineVisible = timelineContainer.style.display === 'block';

        if (isTimelineVisible && button.classList.contains('active')) {
            timelineContainer.style.display = 'none';
            button.classList.remove('active');
            clearInterval(countdownInterval);
            timeline.innerHTML = '';
        } else {
            timelineContainer.style.display = 'block';
            button.classList.add('active');
            renderTimeline(status, row);
        }
    }

    function renderTimeline(status, row) {
        timeline.innerHTML = '';
        const steps = [
            '1.1 - Comunicação com seguradora (Gerando nº de sinistro)',
            '1.2 - Solicitação de reboque para oficina ou residência',
            '1.3 - Agendamento de vistoria',
            '1.4 - Solicitação de documentos de sinistro',
            '1.5 - Análise de documentos',
            '1.6 - Autorização para orçamento',
            '1.7 - Aprovação do orçamento',
            '1.8 - Abertura do pedido de peças',
            '1.9 - Análise da peça',
            '1.10 - Correção de itens pendentes',
            '1.11 - Liberação do veículo'
        ];

        steps.forEach((step, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.classList.add('step');
            stepDiv.textContent = step;
            if (step === status) {
                stepDiv.classList.add('current');
            }
            timeline.appendChild(stepDiv);
        });

        updateCountdown(row);
        countdownInterval = setInterval(() => updateCountdown(row), 1000);
    }

    function updateCountdown(row) {
        const prazoFinal = new Date(row.cells[7].textContent.split('/').reverse().join('-'));
        const now = new Date();
        const timeDiff = prazoFinal - now;
        const maxDiff = 3 * 24 * 60 * 60 * 1000; // 3 dias em milissegundos

        // Limitar o tempo restante a no máximo 3 dias
        const timeRemaining = Math.min(timeDiff, maxDiff);

        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

        const countdownElement = document.createElement('div');
        countdownElement.classList.add('countdown');
        countdownElement.textContent = `Tempo restante: ${days}d ${hours}h ${minutes}m ${seconds}s`;

        const currentStep = document.querySelector('.step.current');
        if (currentStep) {
            const existingCountdown = currentStep.querySelector('.countdown');
            if (existingCountdown) {
                existingCountdown.remove();
            }
            currentStep.appendChild(countdownElement);
        }

        // Se o tempo restante for maior que 3 dias, adicione a classe "overdue" ao elemento
        if (timeRemaining < maxDiff) {
            countdownElement.classList.add('overdue');
        }
    }

    async function confirmDeleteSinistro(sinistroId, row) {
        if (confirm('Tem certeza que deseja excluir este sinistro?')) {
            try {
                await deleteDoc(doc(db, 'sinistros', sinistroId));
                row.remove();
                sinistros = sinistros.filter(sinistro => sinistro.id !== sinistroId);
                alert('Sinistro excluído com sucesso.');
            } catch (error) {
                console.error('Erro ao excluir sinistro:', error);
            }
        }
    }

    async function enviarEmailNovoSinistro(sinistro) {
        const emailData = {
            to: 'dimenziocontact@gmail.com',
            subject: `Novo Sinistro Adicionado: ${sinistro.numeroSinistro}`,
            body: `
                <h1>Detalhes do Novo Sinistro</h1>
                <p><strong>Número do Sinistro:</strong> ${sinistro.numeroSinistro}</p>
                <p><strong>Tipo de Sinistro:</strong> ${sinistro.tipoSinistro}</p>
                <p><strong>Segurado:</strong> ${sinistro.segurado}</p>
                <p><strong>CPF:</strong> ${sinistro.cpf}</p>
                <p><strong>Placa:</strong> ${sinistro.placa}</p>
                <p><strong>Terceiro:</strong> ${sinistro.terceiro}</p>
                <p><strong>Status:</strong> ${sinistro.status}</p>
                <p><strong>Prazo Final:</strong> ${sinistro.prazoFinal}</p>`
            };
    
            try {
                const response = await fetch('https://us-central1-metrosystem-2d2b7.cloudfunctions.net/sendMailOverHTTP', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(emailData)
                });
    
                if (response.ok) {
                    console.log('E-mail enviado com sucesso.');
                } else {
                    console.error('Erro ao enviar e-mail:', response.statusText);
                }
            } catch (error) {
                console.error('Erro ao enviar e-mail:', error);
            }
        }
    
        async function carregarSinistros() {
            const querySnapshot = await getDocs(collection(db, 'sinistros'));
            querySnapshot.forEach(doc => {
                const sinistro = { id: doc.id, ...doc.data() };
                sinistros.push(sinistro);
                addSinistroToTable(sinistro);
            });
        }
    
        carregarSinistros();
    
        // Adicionando funcionalidade de clicar nas etapas para alterar
        timeline.addEventListener('click', function (event) {
            const clickedStep = event.target.closest('.step');
            if (clickedStep) {
                const allSteps = document.querySelectorAll('.step');
                allSteps.forEach(step => step.classList.remove('current'));
                clickedStep.classList.add('current');
                const status = clickedStep.textContent;
                const row = document.querySelector('tr.current');
                const viewTimelineBtn = row.querySelector('.view-timeline');
                toggleTimeline(status, row, viewTimelineBtn);
                updateStatus(status, row);
            }
        });
    
        function updateStatus(status, row) {
            const sinistroId = row.querySelector('.delete-sinistro').getAttribute('data-id');
            const sinistroIndex = sinistros.findIndex(sinistro => sinistro.id === sinistroId);
            if (sinistroIndex !== -1) {
                sinistros[sinistroIndex].status = status;
                row.cells[6].textContent = status;
                // Atualizar no Firestore
                const sinistroRef = doc(db, 'sinistros', sinistroId);
                updateDoc(sinistroRef, { status: status }).then(() => {
                    console.log('Status atualizado no Firestore');
                }).catch(error => {
                    console.error('Erro ao atualizar status no Firestore:', error);
                });
            }
        }
    
        function updateStepAndStatus(stepDiv, row) {
            const status = stepDiv.textContent;
            const select = row.querySelector('.status-dropdown');
            select.value = status;
            updateStatus(status, row);
        }
    });
    
           

 
