/**
 * Validation Module for FixMyCampus
 * Provides real-time field validation, password strength checking, and inline error styling.
 */
const Validation = {
  // Regex Patterns
  patterns: {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^[0-9]{10}$/,
    name: /^[a-zA-Z\s]{2,50}$/
  },

  // Helpers
  isValidEmail(email) {
    return this.patterns.email.test(email.trim());
  },

  isValidPhone(phone) {
    if (!phone.trim()) return true; // Phone is optional in some forms, but if entered must be 10 digits
    return this.patterns.phone.test(phone.trim().replace(/[-()\s]/g, ''));
  },

  isValidName(name) {
    return name.trim().length >= 2;
  },

  isValidPassword(password) {
    return password.length >= 6;
  },

  checkPasswordStrength(password) {
    if (!password) return { score: '', percent: 0, text: '', class: '' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (password.length < 6) {
      return { score: 'weak', percent: 25, text: 'Too Short (min 6 chars)', class: 'strength-weak' };
    } else if (score <= 2) {
      return { score: 'weak', percent: 35, text: 'Weak password', class: 'strength-weak' };
    } else if (score <= 4) {
      return { score: 'medium', percent: 70, text: 'Medium strength', class: 'strength-medium' };
    } else {
      return { score: 'strong', percent: 100, text: 'Strong password', class: 'strength-strong' };
    }
  },

  // DOM error feedback helpers
  showFieldError(inputEl, message) {
    if (typeof inputEl === 'string') inputEl = document.getElementById(inputEl);
    if (!inputEl) return;

    const wrap = inputEl.closest('.input-wrap') || inputEl.parentElement;
    wrap.classList.add('has-error');
    wrap.classList.remove('has-success');
    inputEl.classList.add('is-invalid');
    inputEl.classList.remove('is-valid');

    // Find or create field-error element
    let errEl = wrap.parentElement.querySelector('.field-error');
    if (!errEl) {
      errEl = document.createElement('div');
      errEl.className = 'field-error';
      wrap.parentElement.appendChild(errEl);
    }
    errEl.innerHTML = `<span class="err-icon">⚠️</span> ${message}`;
    errEl.style.display = 'flex';
  },

  clearFieldError(inputEl) {
    if (typeof inputEl === 'string') inputEl = document.getElementById(inputEl);
    if (!inputEl) return;

    const wrap = inputEl.closest('.input-wrap') || inputEl.parentElement;
    wrap.classList.remove('has-error');
    inputEl.classList.remove('is-invalid');

    const errEl = wrap.parentElement.querySelector('.field-error');
    if (errEl) {
      errEl.style.display = 'none';
      errEl.innerHTML = '';
    }
  },

  showFieldSuccess(inputEl) {
    if (typeof inputEl === 'string') inputEl = document.getElementById(inputEl);
    if (!inputEl) return;

    this.clearFieldError(inputEl);
    const wrap = inputEl.closest('.input-wrap') || inputEl.parentElement;
    wrap.classList.add('has-success');
    inputEl.classList.add('is-valid');
  },

  clearFormValidation(formEl) {
    if (typeof formEl === 'string') formEl = document.getElementById(formEl);
    if (!formEl) return;

    const inputs = formEl.querySelectorAll('input, select, textarea');
    inputs.forEach(input => this.clearFieldError(input));

    const alertBox = formEl.querySelector('#alertBox') || document.getElementById('alertBox');
    if (alertBox) alertBox.innerHTML = '';
  },

  // Specific Form Validations

  // 1. Student Login Validation
  validateLogin(emailVal, passwordVal) {
    let isValid = true;
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');

    if (!emailVal) {
      this.showFieldError(emailEl, 'Email address is required.');
      isValid = false;
    } else if (!this.isValidEmail(emailVal)) {
      this.showFieldError(emailEl, 'Please enter a valid email address (e.g., student@campus.edu).');
      isValid = false;
    } else {
      this.showFieldSuccess(emailEl);
    }

    if (!passwordVal) {
      this.showFieldError(passwordEl, 'Password is required.');
      isValid = false;
    } else if (passwordVal.length < 6) {
      this.showFieldError(passwordEl, 'Password must be at least 6 characters.');
      isValid = false;
    } else {
      this.showFieldSuccess(passwordEl);
    }

    return isValid;
  },

  // 2. Admin Login Validation
  validateAdminLogin(emailVal, passwordVal) {
    let isValid = true;
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');

    if (!emailVal) {
      this.showFieldError(emailEl, 'Admin Email is required.');
      isValid = false;
    } else if (!this.isValidEmail(emailVal)) {
      this.showFieldError(emailEl, 'Please enter a valid email address.');
      isValid = false;
    } else {
      this.showFieldSuccess(emailEl);
    }

    if (!passwordVal) {
      this.showFieldError(passwordEl, 'Password is required.');
      isValid = false;
    } else {
      this.showFieldSuccess(passwordEl);
    }

    return isValid;
  },

  // 3. Registration Validation
  validateRegistration(data) {
    let isValid = true;
    const nameEl = document.getElementById('fullName');
    const emailEl = document.getElementById('email');
    const phoneEl = document.getElementById('phone');
    const deptEl = document.getElementById('department');
    const yearEl = document.getElementById('year');
    const pwEl = document.getElementById('password');
    const confirmPwEl = document.getElementById('confirmPassword');

    // Full Name
    if (!data.fullName) {
      this.showFieldError(nameEl, 'Full Name is required.');
      isValid = false;
    } else if (!this.isValidName(data.fullName)) {
      this.showFieldError(nameEl, 'Please enter a valid full name (at least 2 characters).');
      isValid = false;
    } else {
      this.showFieldSuccess(nameEl);
    }

    // Email
    if (!data.email) {
      this.showFieldError(emailEl, 'Email is required.');
      isValid = false;
    } else if (!this.isValidEmail(data.email)) {
      this.showFieldError(emailEl, 'Please enter a valid email address.');
      isValid = false;
    } else {
      this.showFieldSuccess(emailEl);
    }

    // Phone
    if (data.phone && !this.isValidPhone(data.phone)) {
      this.showFieldError(phoneEl, 'Phone number must be exactly 10 digits.');
      isValid = false;
    } else if (data.phone) {
      this.showFieldSuccess(phoneEl);
    } else {
      this.clearFieldError(phoneEl);
    }

    // Department
    if (!data.department) {
      this.showFieldError(deptEl, 'Please select your department.');
      isValid = false;
    } else {
      this.showFieldSuccess(deptEl);
    }

    // Year
    if (!data.year) {
      this.showFieldError(yearEl, 'Please select your academic year.');
      isValid = false;
    } else {
      this.showFieldSuccess(yearEl);
    }

    // Password
    if (!data.password) {
      this.showFieldError(pwEl, 'Password is required.');
      isValid = false;
    } else if (!this.isValidPassword(data.password)) {
      this.showFieldError(pwEl, 'Password must be at least 6 characters long.');
      isValid = false;
    } else {
      this.showFieldSuccess(pwEl);
    }

    // Confirm Password
    if (!data.confirmPassword) {
      this.showFieldError(confirmPwEl, 'Please confirm your password.');
      isValid = false;
    } else if (data.password !== data.confirmPassword) {
      this.showFieldError(confirmPwEl, 'Passwords do not match.');
      isValid = false;
    } else {
      this.showFieldSuccess(confirmPwEl);
    }

    return isValid;
  },

  // 4. Report Complaint Validation
  validateComplaintForm(data) {
    let isValid = true;
    const titleEl = document.getElementById('title');
    const categoryEl = document.getElementById('category');
    const locationEl = document.getElementById('location');
    const descEl = document.getElementById('description');

    // Auto-populate title from category if empty or title field hidden
    if ((!data.title || data.title.trim().length < 3) && data.category) {
      data.title = `${data.category} Maintenance Report`;
      if (titleEl) titleEl.value = data.title;
    }

    if (!data.title || data.title.trim().length < 3) {
      if (titleEl && titleEl.type !== 'hidden') {
        this.showFieldError(titleEl, 'Please select a category to generate issue title.');
      }
      isValid = false;
    } else if (titleEl && titleEl.type !== 'hidden') {
      this.showFieldSuccess(titleEl);
    }

    if (!data.category) {
      if (categoryEl) this.showFieldError(categoryEl, 'Please tap a category card above.');
      isValid = false;
    } else if (categoryEl) {
      this.showFieldSuccess(categoryEl);
    }

    if (!data.location || data.location.trim().length < 3) {
      if (locationEl) this.showFieldError(locationEl, 'Please specify exact location (e.g. Block A, Room 302).');
      isValid = false;
    } else if (locationEl) {
      this.showFieldSuccess(locationEl);
    }

    if (!data.description || data.description.trim().length < 5) {
      if (descEl) this.showFieldError(descEl, 'Please select a quick issue chip or describe the problem.');
      isValid = false;
    } else if (descEl) {
      this.showFieldSuccess(descEl);
    }

    return isValid;
  }
};

