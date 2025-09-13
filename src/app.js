const express = require("express");
const path = require("path");
const ejsLayouts = require("express-ejs-layouts");

const dotenv = require("dotenv");
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });

const session = require("express-session");
const flash = require("connect-flash");

// A importação do 'db' aqui é apenas para garantir que a conexão é iniciada.
const db = require("./config/database");
const profileRoutes = require("./routes/profile");
const profilesApiRoutes = require("./routes/profiles");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const departmentRoutes = require("./routes/departments");
const movementRoutes = require("./routes/movements");
const reportRoutes = require("./routes/reports");
const dashboardRoutes = require("./routes/dashboard");
const adminRoutes = require("./routes/admin");
const sugestaoRoutes = require("./routes/sugestao");
const cookieParser = require("cookie-parser");
const Movement = require("./models/Movement");
const searchRoutes = require("./routes/search");

const app = express();
const PORT = process.env.PORT || 8001;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static("uploads"));

// Configurar View Engine com Layouts
app.use(ejsLayouts);
app.set("layout", "./layouts/main");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "963b6067ab26c28b3c3f75e42f017d38",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 },
  })
);
app.use(flash());

app.use(async (req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.user = req.user || null;
  res.locals.userProfile = req.userProfile || null;

  // Lógica para buscar notificações de pendências para o admin
  if (req.user && req.user.is_staff) {
    try {
      const pendingMovements = await Movement.getPendingMovements();
      res.locals.pendingApprovals = pendingMovements.length;
    } catch (error) {
      console.error("Erro ao buscar pendências para o topbar:", error);
      res.locals.pendingApprovals = 0;
    }
  } else {
    res.locals.pendingApprovals = 0;
  }

  next();
});

// Middleware para passar flash messages e user para todas as views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.user = req.user || null;
  res.locals.userProfile = req.userProfile || null;
  next();
});

// Rotas
app.use("/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/v1/movements", movementRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/profiles", profilesApiRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/sugestao", sugestaoRoutes);
app.use("/admin", adminRoutes);
app.use("/profile", profileRoutes);
app.use("/", dashboardRoutes);

// NOVO GESTOR DE ERROS INTELIGENTE
// ==========================================================
app.use((err, req, res, next) => {
  console.error("ERRO DETECTADO:", err.stack);

  // Verifica se a rota do erro é uma rota de API
  if (req.originalUrl.startsWith("/api/")) {
    // Se for API, responde com JSON
    return res.status(500).json({
      message: "Ocorreu um erro interno no servidor.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }

  // Se não for API, renderiza a página de erro HTML
  res.status(500).render("error", {
    title: "Erro de Servidor",
    message: err.message,
    error: err,
    layout: false,
  });
});

app.use((req, res, next) => {
  res.status(404).render("error", {
    title: "Página Não Encontrada",
    message: "A página que você procura não existe.",
  });
});

// Inicializar Servidor
app.listen(PORT, () => {
  console.log("📊 Banco de dados inicializado com sucesso");
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  console.log(`🛠️  Ambiente: ${process.env.NODE_ENV}`);
});
