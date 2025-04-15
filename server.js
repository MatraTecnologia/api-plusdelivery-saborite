require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pedidosRoutes = require('./routes/pedidos');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(cors());

// Rotas
app.use('/api/pedidos', pedidosRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({ 
    message: 'API do Bot Maurício - Backend',
    endpoints: {
      pedidos: '/api/pedidos'
    }
  });
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 