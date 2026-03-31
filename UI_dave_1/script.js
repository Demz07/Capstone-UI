(function () {
        "use strict";

        // ===== Clock =====
        const Clock = {
          el: null,
          tid: null,
          init() {
            this.el = document.getElementById("statusTime");
            if (!this.el) return;
            this.tick();
            this.tid = setInterval(() => this.tick(), 30000);
          },
          tick() {
            if (!this.el) return;
            const d = new Date();
            const h = d.getHours().toString().padStart(2, "0");
            const m = d.getMinutes().toString().padStart(2, "0");
            this.el.textContent = `${h}:${m}`;
          },
        };

        // ===== Splash Animation =====
        const Splash = {
          brand: "EcoPower",
          timers: [],

          els: {},

          init() {
            this.els = {
              splash: document.getElementById("ecoSplash"),
              logo: document.getElementById("splashLogo"),
              glow: document.getElementById("splashGlow"),
              brandWrap: document.getElementById("splashBrand"),
              brandName: document.getElementById("splashBrandName"),
              tagline: document.getElementById("splashTagline"),
              progress: document.getElementById("splashProgress"),
              progressBar: document.getElementById("splashProgressBar"),
              app: document.getElementById("mainApp"),
            };

            if (!this.els.splash) return;

            this.buildLetters();
            this.run();
          },

          buildLetters() {
            const c = this.els.brandName;
            if (!c) return;
            c.innerHTML = "";
            this.brand.split("").forEach((ch) => {
              const s = document.createElement("span");
              s.className = "letter";
              s.textContent = ch;
              c.appendChild(s);
            });
          },

          delay(fn, ms) {
            this.timers.push(setTimeout(fn, ms));
          },

          run() {
            const {
              logo,
              glow,
              brandWrap,
              brandName,
              tagline,
              progress,
              progressBar,
            } = this.els;
            const letters = brandName
              ? brandName.querySelectorAll(".letter")
              : [];

            // === Phase 1: Logo grows in center (0.4s) ===
            this.delay(() => {
              logo.classList.add("eco-splash__logo--grow");
            }, 400);

            // === Phase 1b: Glow ring appears (1s) ===
            this.delay(() => {
              glow.classList.add("eco-splash__glow-ring--visible");
              const bg = document.querySelector(".eco-splash .eco-shader-bg");
              if (bg) bg.classList.add("eco-shader-bg--visible");
            }, 1000);

            // === Phase 2: Brand name appears (1.6s) ===
            this.delay(() => {
              // Show the brand wrapper
              brandWrap.classList.add("eco-splash__brand--visible");

              // Animate each letter with stagger
              letters.forEach((letter, i) => {
                this.delay(() => {
                  letter.classList.add("letter--visible");
                }, i * 75);
              });
            }, 1600);

            // === Phase 3: Tagline appears (2.4s) ===
            this.delay(() => {
              tagline.classList.add("eco-splash__tagline--visible");
            }, 2400);

            // === Phase 4: Progress bar (2.6s) ===
            this.delay(() => {
              progress.classList.add("eco-splash__progress--visible");
              progressBar.classList.add("eco-splash__progress-bar--filling");
            }, 2600);

            // === Phase 5: Logo starts breathing (2.8s) ===
            this.delay(() => {
              logo.classList.remove("eco-splash__logo--grow");
              logo.style.transform = "scale(1)";
              logo.style.opacity = "1";
              logo.classList.add("eco-splash__logo--breathing");
            }, 2800);

            // === Phase 6: Hide splash → show app (4.6s) ===
            this.delay(() => {
              this.hideSplash();
            }, 4600);
          },

          hideSplash() {
            const { splash, app } = this.els;

            // Fade out splash
            splash.classList.add("eco-splash--hidden");

            // Show auth app instead of main app
            const authApp = document.getElementById("authApp");
            if (authApp) {
              authApp.hidden = false;
              // Force reflow
              void authApp.offsetWidth;
              authApp.classList.add("auth-app--visible");
            }

            console.log("✅ EcoPower splash complete (Auth Screen)");
          },

          destroy() {
            this.timers.forEach((id) => clearTimeout(id));
            this.timers = [];
          },
        };

        // ===== Auth Screen Logic =====
        const AuthScreen = {
          login() {
            const authApp = document.getElementById("authApp");
            const mainApp = document.getElementById("mainApp");
            
            if (authApp && mainApp) {
              // Animate out auth app
              authApp.classList.remove("auth-app--visible");
              
              if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(10);
              }
              
              // Wait for auth to fade out, then show main dashboard
              setTimeout(() => {
                authApp.hidden = true;
                
                mainApp.hidden = false;
                void mainApp.offsetWidth;
                mainApp.classList.add("main-app--visible");
                
                console.log("✅ Logged in successfully");
              }, 600);
            }
          },

          switchTab(tab) {
            const loginCard = document.getElementById("authLoginCard");
            const signupCard = document.getElementById("authSignupCard");
            const otpCard = document.getElementById("authOtpCard");
            
            if (loginCard && signupCard) {
              if (otpCard) otpCard.hidden = true;
              
              if (tab === "signup") {
                loginCard.hidden = true;
                signupCard.hidden = false;
              } else {
                signupCard.hidden = true;
                loginCard.hidden = false;
              }
            }
          },

          togglePassword(id) {
            const input = document.getElementById(id);
            if (!input) return;
            const btn = input.nextElementSibling;
            const icon = btn ? btn.querySelector("i") : null;
            
            if (input.type === "password") {
              input.type = "text";
              if (icon) icon.className = "bi bi-eye-slash";
            } else {
              input.type = "password";
              if (icon) icon.className = "bi bi-eye";
            }
          },

          showOtp() {
            const loginCard = document.getElementById("authLoginCard");
            const signupCard = document.getElementById("authSignupCard");
            const otpCard = document.getElementById("authOtpCard");
            
            if (otpCard) {
              if (loginCard) loginCard.hidden = true;
              if (signupCard) signupCard.hidden = true;
              otpCard.hidden = false;
              
              if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(5);
              }
              
              // Auto focus first input
              const inputs = document.querySelectorAll(".otp-box");
              setTimeout(() => {
                if(inputs.length > 0) inputs[0].focus();
              }, 100);
            }
          },
          
          hideOtp() {
            const loginCard = document.getElementById("authLoginCard");
            const signupCard = document.getElementById("authSignupCard");
            const otpCard = document.getElementById("authOtpCard");
            
            if (otpCard) {
              otpCard.hidden = true;
              if (loginCard) loginCard.hidden = false; // default back to login
              
              if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(5);
              }
            }
          },

          initOtp() {
            const inputs = document.querySelectorAll(".otp-box");
            if (!inputs) return;
            
            inputs.forEach((input, index) => {
              input.addEventListener("keyup", (e) => {
                // If a number is pressed
                if (e.key >= 0 && e.key <= 9) {
                  input.value = e.key;
                  if (index < inputs.length - 1) inputs[index + 1].focus();
                } 
                // Backspace logic
                else if (e.key === "Backspace") {
                  input.value = "";
                  if (index > 0) inputs[index - 1].focus();
                }
              });
            });
          }
        };
        
        // Expose to window for inline onclick handler
        window.AuthScreen = AuthScreen;

        // ===== Navigation Interactivity =====
        const Navigation = {
          init() {
            const nav = document.querySelector(".app-nav");
            if (!nav) return;

            const items = nav.querySelectorAll(".app-nav__item");
            items.forEach((item) => {
              item.addEventListener("click", (e) => {
                e.preventDefault();
                items.forEach((i) => i.classList.remove("app-nav__item--active"));
                item.classList.add("app-nav__item--active");

                if (window.navigator && window.navigator.vibrate) {
                  window.navigator.vibrate(5);
                }
              });
            });
          },
        };

        // ===== Theme Toggle =====
        const ThemeToggle = {
          init() {
            const btn = document.getElementById("themeToggle");
            const icon = document.getElementById("themeIcon");
            if (!btn || !icon) return;

            btn.addEventListener("click", () => {
              const root = document.documentElement;
              const isLight = root.classList.contains("light-mode");

              if (isLight) {
                root.classList.remove("light-mode");
                icon.className = "bi bi-moon-fill"; // Dark mode icon
              } else {
                root.classList.add("light-mode");
                icon.className = "bi bi-brightness-high-fill"; // Light mode icon
              }
              
              if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(5);
              }
            });
          }
        };

        // ===== Init =====
        function boot() {
          Clock.init();
          Splash.init();
          Navigation.init();
          ThemeToggle.init();
          AuthScreen.initOtp();
        }

        if (document.readyState !== "loading") boot();
        else document.addEventListener("DOMContentLoaded", boot);

        window.addEventListener("beforeunload", () => {
          if (Clock.tid) clearInterval(Clock.tid);
          Splash.destroy();
        });
      })();