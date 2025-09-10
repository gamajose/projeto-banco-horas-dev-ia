// Main JavaScript file for Banco de Horas
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    initializeNavigation();
    initializeModals();
    initializeForms();
    initializeNotifications();
    initializeTimeDisplay();
  });

  // --- LÓGICA PARA MODAL DE AÇÕES RÁPIDAS (ADMIN) ---
  document.addEventListener('DOMContentLoaded', () => {
    console.log("Módulo de Ações Rápidas carregado!")
    const modal = document.getElementById('modal-acao-rapida');
    if (!modal) return;

    // Elementos do Modal
    const title = document.getElementById('modal-acao-rapida-title');
    const form = document.getElementById('form-acao-rapida');
    const feedbackDiv = document.getElementById('acao-rapida-feedback');
    const dataInput = document.getElementById('acao-rapida-data');
    const hiddenInputEntrada = document.getElementById('acao-rapida-entrada');
    const containerTipoAjuste = document.getElementById('container-tipo-ajuste');
    const selectTipoAjuste = document.getElementById('acao-rapida-tipo');

    // Botões que abrem o modal
    const btnEntrada = document.getElementById('acao-registrar-entrada');
    const btnSaida = document.getElementById('acao-registrar-saida');
    const btnAjuste = document.getElementById('acao-solicitar-ajuste');
    const btnClose = document.getElementById('modal-acao-rapida-close');

    const openModal = (config) => {
        title.textContent = config.title;
        hiddenInputEntrada.value = config.entrada;
        feedbackDiv.innerHTML = '';
        form.reset();
        
        // Preenche a data atual
        const today = new Date();
        dataInput.value = today.toISOString().split('T')[0];

        // Lógica para "Solicitar Ajuste"
        if (config.showTypeSelector) {
            containerTipoAjuste.classList.remove('hidden');
            selectTipoAjuste.setAttribute('name', 'entrada');
            hiddenInputEntrada.removeAttribute('name');
        } else {
            containerTipoAjuste.classList.add('hidden');
            hiddenInputEntrada.setAttribute('name', 'entrada');
            selectTipoAjuste.removeAttribute('name');
        }
        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    // Listeners dos botões
    if (btnEntrada) btnEntrada.addEventListener('click', () => openModal({ title: 'Registrar Entrada de Horas', entrada: 'true', showTypeSelector: false }));
    if (btnSaida) btnSaida.addEventListener('click', () => openModal({ title: 'Registrar Saída de Horas', entrada: 'false', showTypeSelector: false }));
    if (btnAjuste) btnAjuste.addEventListener('click', () => openModal({ title: 'Solicitar Ajuste de Ponto', entrada: 'true', showTypeSelector: true }));

    if (btnClose) btnClose.addEventListener('click', closeModal);
    modal.addEventListener('click', e => (e.target === modal) && closeModal());

    // Listener do formulário
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            feedbackDiv.textContent = 'A enviar...';
            feedbackDiv.className = 'mt-4 text-sm font-medium text-gray-500';

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/api/v1/movements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Ocorreu um erro.');

                feedbackDiv.textContent = 'Solicitação enviada com sucesso!';
                feedbackDiv.className = 'mt-4 text-sm font-medium text-green-600';

                setTimeout(() => {
                    closeModal();
                }, 1500);
            } catch (error) {
                feedbackDiv.textContent = `Erro: ${error.message}`;
                feedbackDiv.className = 'mt-4 text-sm font-medium text-red-600';
            }
        });
    }
});

  // --- Funcionalidade de navegação e menus ---
  function initializeNavigation() {
    const dropdowns = {
      "notifications-btn": "notifications-dropdown",
      "quick-actions-btn": "quick-actions-dropdown",
      "user-menu-btn": "user-menu-dropdown",
    };
    
    // Adiciona "escutadores" de eventos para cada botão de menu.
    Object.keys(dropdowns).forEach((btnId) => {
      const btn = document.getElementById(btnId);
      const dropdown = document.getElementById(dropdowns[btnId]);

      if (btn && dropdown) {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          Object.keys(dropdowns).forEach((otherBtnId) => {
            if (otherBtnId !== btnId) {
              const otherDropdown = document.getElementById(dropdowns[otherBtnId]);
              if (otherDropdown) {
                otherDropdown.classList.add("hidden");
              }
            }
          });
          dropdown.classList.toggle("hidden");
        });
      }
    });

    // Fecha todos os menus drop-down quando o usuário clica em qualquer lugar do documento.
    document.addEventListener("click", function () {
      Object.values(dropdowns).forEach((dropdownId) => {
        const dropdown = document.getElementById(dropdownId);
        if (dropdown) {
          dropdown.classList.add("hidden");
        }
      });
    });

    // Impede que o clique dentro de um menu drop-down o feche.
    Object.values(dropdowns).forEach((dropdownId) => {
      const dropdown = document.getElementById(dropdownId);
      if (dropdown) {
        dropdown.addEventListener("click", function (e) {
          e.stopPropagation();
        });
      }
    });

    // Sidebar mobile functionality (existing code from main.ejs)
    const mobileNavBtn = document.getElementById("mobile-nav-btn");
    const mobileOverlay = document.getElementById("mobile-overlay");
    const sidebar = document.getElementById("sidebar");
    if (mobileNavBtn && mobileOverlay && sidebar) {
      mobileNavBtn.addEventListener("click", function () {
        sidebar.classList.add("open");
        mobileOverlay.style.display = "block";
        document.body.style.overflow = "hidden";
      });
      mobileOverlay.addEventListener("click", function () {
        sidebar.classList.remove("open");
        mobileOverlay.style.display = "none";
        document.body.style.overflow = "auto";
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          sidebar.classList.remove("open");
          mobileOverlay.style.display = "none";
          document.body.style.overflow = "auto";
        }
      });
    }
  }

  // --- Funcionalidade de modais ---
  function initializeModals() {
    // Close modal when clicking on overlay
    document.addEventListener("click", function (e) {
      if (e.target.classList.contains("modal-overlay")) {
        closeModal(e.target.closest(".modal"));
      }
    });

    // Close modal when pressing ESC
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        const openModal = document.querySelector(".modal:not(.hidden)");
        if (openModal) {
          closeModal(openModal);
        }
      }
    });
  }

  // --- Funcionalidade de formulários ---
  function initializeForms() {
    // Auto-calculate total time
    const horaInicialInputs = document.querySelectorAll(
      'input[name="hora_inicial"]'
    );
    const horaFinalInputs = document.querySelectorAll(
      'input[name="hora_final"]'
    );

    horaInicialInputs.forEach((input) => {
      input.addEventListener("change", calculateTotalTime);
    });

    horaFinalInputs.forEach((input) => {
      input.addEventListener("change", calculateTotalTime);
    });

    // Form validation
    const forms = document.querySelectorAll("form");
    forms.forEach((form) => {
      form.addEventListener("submit", function () {
        const submitBtn = form.querySelector(
          'button[type="submit"], input[type="submit"]'
        );
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.disabled = true;
          const originalText = submitBtn.textContent;
          submitBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin mr-2"></i>Processando...';
          setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
          }, 5000);
        }
      });
    });
  }

  // --- Funcionalidade de notificações ---
  function initializeNotifications() {
    setTimeout(function () {
      const alerts = document.querySelectorAll('.alert');
      alerts.forEach(function (alert) {
        alert.style.transition = 'opacity 0.5s ease';
        alert.style.opacity = '0';
        setTimeout(function () {
          alert.remove();
        }, 500);
      });
    }, 5000);
  }

  // --- Funcionalidade do relógio ---
  function initializeTimeDisplay() {
    function updateTime() {
      const now = new Date();
      const timeString = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const timeElement = document.getElementById('current-time');
      if (timeElement) {
        timeElement.textContent = timeString;
      }
    }
    updateTime();
    setInterval(updateTime, 1000);
  }

  // --- Funções de utilidade globais ---
  window.showNotification = function (message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `fixed top-4 right-4 z-50 max-w-sm p-4 rounded-xl shadow-lg transform translate-x-full transition-transform duration-300`;
    switch (type) {
      case "success":
        notification.classList.add("bg-emerald-500", "text-white");
        break;
      case "error":
        notification.classList.add("bg-red-500", "text-white");
        break;
      case "warning":
        notification.classList.add("bg-amber-500", "text-white");
        break;
      default:
        notification.classList.add("bg-blue-500", "text-white");
    }

    notification.innerHTML = `
            <div class="flex items-center">
                <span class="flex-1">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white/80 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.remove("translate-x-full");
    }, 100);
    setTimeout(() => {
      notification.classList.add("translate-x-full");
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 5000);
  };

  window.showLoading = function () {
    document.getElementById("loading-overlay").style.display = "flex";
  };

  window.hideLoading = function () {
    document.getElementById("loading-overlay").style.display = "none";
  };

  function calculateTotalTime() {
    const horaInicial = document.querySelector('input[name="hora_inicial"]');
    const horaFinal = document.querySelector('input[name="hora_final"]');
    const horaTotal = document.querySelector('input[name="hora_total"]');

    if (horaInicial && horaFinal && horaTotal && horaInicial.value && horaFinal.value) {
      const inicio = timeToMinutes(horaInicial.value);
      const fim = timeToMinutes(horaFinal.value);
      let diferenca = fim - inicio;
      if (diferenca < 0) {
        diferenca += 24 * 60;
      }
      horaTotal.value = minutesToTime(diferenca);
    }
  }

  function timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function minutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll("[required]");

    requiredFields.forEach((field) => {
      if (!field.value.trim()) {
        showFieldError(field, "Este campo é obrigatório");
        isValid = false;
      } else {
        hideFieldError(field);
      }
    });

    const emailFields = form.querySelectorAll('input[type="email"]');
    emailFields.forEach((field) => {
      if (field.value && !isValidEmail(field.value)) {
        showFieldError(field, "Email inválido");
        isValid = false;
      }
    });

    const password = form.querySelector('input[name="password"]');
    const passwordConfirm = form.querySelector(
      'input[name="password_confirm"]'
    );

    if (
      password &&
      passwordConfirm &&
      password.value !== passwordConfirm.value
    ) {
      showFieldError(passwordConfirm, "As senhas não coincidem");
      isValid = false;
    }

    return isValid;
  }

  function showFieldError(field, message) {
    hideFieldError(field);

    const errorDiv = document.createElement("div");
    errorDiv.className = "field-error text-red-600 text-sm mt-1";
    errorDiv.textContent = message;

    field.classList.add("border-red-500");
    field.parentNode.appendChild(errorDiv);
  }

  function hideFieldError(field) {
    const existingError = field.parentNode.querySelector(".field-error");
    if (existingError) {
      existingError.remove();
    }
    field.classList.remove("border-red-500");
  }

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  }

  function closeModal(modal) {
    if (modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "";
    }
  }

  window.BancoDeHoras = {
    showModal,
    closeModal,
    showNotification,
    hideNotification,
    calculateTotalTime,
    validateForm,
  };
})();