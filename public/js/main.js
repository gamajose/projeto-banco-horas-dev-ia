// Main JavaScript file for Banco de Horas
(function() {
    'use strict';

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function() {
        initializeNavigation();
        initializeModals();
        initializeForms();
        initializeNotifications();
    });

    // Navigation functionality
    function initializeNavigation() {
        // Mobile menu toggle
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', function() {
                mobileMenu.classList.toggle('hidden');
            });
        }

        // User menu toggle
        const userMenuButton = document.getElementById('user-menu-button');
        const userMenu = document.getElementById('user-menu');
        
        if (userMenuButton && userMenu) {
            userMenuButton.addEventListener('click', function(e) {
                e.stopPropagation();
                userMenu.classList.toggle('hidden');
            });

            // Close menu when clicking outside
            document.addEventListener('click', function() {
                if (!userMenu.classList.contains('hidden')) {
                    userMenu.classList.add('hidden');
                }
            });

            userMenu.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
    }

    // Modal functionality
    function initializeModals() {
        // Close modal when clicking on overlay
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal-overlay')) {
                closeModal(e.target.closest('.modal'));
            }
        });

        // Close modal when pressing ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal:not(.hidden)');
                if (openModal) {
                    closeModal(openModal);
                }
            }
        });
    }

    // Form functionality
    function initializeForms() {
        // Auto-calculate total time
        const horaInicialInputs = document.querySelectorAll('input[name="hora_inicial"]');
        const horaFinalInputs = document.querySelectorAll('input[name="hora_final"]');
        
        horaInicialInputs.forEach(input => {
            input.addEventListener('change', calculateTotalTime);
        });
        
        horaFinalInputs.forEach(input => {
            input.addEventListener('change', calculateTotalTime);
        });

        // Form validation
        const forms = document.querySelectorAll('form[data-validate]');
        forms.forEach(form => {
            form.addEventListener('submit', function(e) {
                if (!validateForm(form)) {
                    e.preventDefault();
                }
            });
        });
    }

    // Notifications
    function initializeNotifications() {
        // Auto-hide success notifications
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => {
            if (notification.classList.contains('notification-success')) {
                setTimeout(() => {
                    hideNotification(notification);
                }, 5000);
            }
        });

        // Close notification buttons
        const closeButtons = document.querySelectorAll('.notification .close-btn');
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const notification = button.closest('.notification');
                hideNotification(notification);
            });
        });
    }

    // Utility functions
    function calculateTotalTime() {
        const horaInicial = document.querySelector('input[name="hora_inicial"]');
        const horaFinal = document.querySelector('input[name="hora_final"]');
        const horaTotal = document.querySelector('input[name="hora_total"]');
        
        if (horaInicial && horaFinal && horaTotal && horaInicial.value && horaFinal.value) {
            const inicio = timeToMinutes(horaInicial.value);
            const fim = timeToMinutes(horaFinal.value);
            
            let diferenca = fim - inicio;
            if (diferenca < 0) {
                diferenca += 24 * 60; // Adiciona 24 horas se passou da meia-noite
            }
            
            horaTotal.value = minutesToTime(diferenca);
        }
    }

    function timeToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    function minutesToTime(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    function validateForm(form) {
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                showFieldError(field, 'Este campo é obrigatório');
                isValid = false;
            } else {
                hideFieldError(field);
            }
        });

        // Email validation
        const emailFields = form.querySelectorAll('input[type="email"]');
        emailFields.forEach(field => {
            if (field.value && !isValidEmail(field.value)) {
                showFieldError(field, 'Email inválido');
                isValid = false;
            }
        });

        // Password confirmation
        const password = form.querySelector('input[name="password"]');
        const passwordConfirm = form.querySelector('input[name="password_confirm"]');
        
        if (password && passwordConfirm && password.value !== passwordConfirm.value) {
            showFieldError(passwordConfirm, 'As senhas não coincidem');
            isValid = false;
        }

        return isValid;
    }

    function showFieldError(field, message) {
        hideFieldError(field); // Remove existing error
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error text-red-600 text-sm mt-1';
        errorDiv.textContent = message;
        
        field.classList.add('border-red-500');
        field.parentNode.appendChild(errorDiv);
    }

    function hideFieldError(field) {
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        field.classList.remove('border-red-500');
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modal) {
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification fixed top-4 right-4 z-50 max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden`;
        
        const bgColor = {
            'success': 'bg-green-50 border-green-200',
            'error': 'bg-red-50 border-red-200',
            'warning': 'bg-yellow-50 border-yellow-200',
            'info': 'bg-blue-50 border-blue-200'
        }[type] || 'bg-blue-50 border-blue-200';

        const iconColor = {
            'success': 'text-green-400',
            'error': 'text-red-400',
            'warning': 'text-yellow-400',
            'info': 'text-blue-400'
        }[type] || 'text-blue-400';

        const textColor = {
            'success': 'text-green-800',
            'error': 'text-red-800',
            'warning': 'text-yellow-800',
            'info': 'text-blue-800'
        }[type] || 'text-blue-800';

        notification.innerHTML = `
            <div class="p-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 ${iconColor}" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3 w-0 flex-1 pt-0.5">
                        <p class="text-sm font-medium ${textColor}">${message}</p>
                    </div>
                    <div class="ml-4 flex-shrink-0 flex">
                        <button class="close-btn rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none">
                            <span class="sr-only">Fechar</span>
                            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Add close functionality
        const closeBtn = notification.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => hideNotification(notification));

        // Auto-hide after 5 seconds for success notifications
        if (type === 'success') {
            setTimeout(() => hideNotification(notification), 5000);
        }

        return notification;
    }

    function hideNotification(notification) {
        if (notification) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    // API helpers
    async function apiRequest(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, finalOptions);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Erro na requisição');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Export utility functions globally
    window.BancoDeHoras = {
        showModal,
        closeModal,
        showNotification,
        hideNotification,
        apiRequest,
        calculateTotalTime,
        validateForm
    };

})();