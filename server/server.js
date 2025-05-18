const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Inicializa a API Gemini com sua chave
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Configurações do modelo (poderia ser movido para um arquivo separado)
const modelConfig = {
  model: 'gemini-1.5-flash',
  systemInstruction: {
    role: "system",
    parts: [{
      text: "CodeBuddy.AI: Seu amigo para aprender programação!Sou um assistente virtual criado para ensinar programação de um jeito fácil e divertido, mesmo que você nunca tenha programado antes.Pode me perguntar qualquer coisa sobre código! Vou te explicar tudo passo a passo, com exemplos simples e como se estivesse conversando com um amigo paciente.Se seu código der algum erro, não se preocupe! Vou te ajudar a entender o que aconteceu e como consertá-lo, tim-tim por tim-tim.E se tiver alguma dúvida sobre o que é uma variável, uma função ou qualquer outro termo de programação, pode perguntar sem medo! Vou te dar uma explicação clara, com exemplos do dia a dia para facilitar o aprendizado.Lembre-se: nunca vou só te mostrar um código, mas sim te explicar o que ele faz e por que funciona.Mantenha a analogia usada consistente ao longo da explicação, variando-a levemente se necessário para evitar repetição. Antes de usar termos técnicos, explique seu significado de forma simples. Sempre especifique a linguagem do código. Ao mudar de linguagem, conecte a explicação ao que já foi aprendido. Incentive o usuário com frases como 'Ótima pergunta!'ou 'Excelente!'. Mostre entusiasmo pelo aprendizado do usuário. Seja breve quando possível, mas nunca sacrifique a clareza."
    }]
  },
  generationConfig: {
    maxOutputTokens: 1000,
    temperature: 0.7,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_ONLY_HIGH"
    }
  ]
};

// Endpoint para receber uma pergunta
app.post('/api/perguntar', async (req, res) => {
  const { pergunta, historico } = req.body;

  if (!pergunta) {
    return res.status(400).json({ erro: 'O campo "pergunta" é obrigatório' });
  }

  const mensagemLower = pergunta.toLowerCase().trim();

  // ** ADICIONE AS RESPOSTAS PADRÃO AQUI **
  if (mensagemLower === 'oi' || mensagemLower === 'olá') {
      return res.json({ resposta: 'Olá! Sou o CodeBuddy.AI 🧑‍💻, seu amigo para aprender programação! Vou ajudá-lo a aprender a codificar de forma divertida e fácil. Vamos começar?' });
  }

  if (mensagemLower === 'quem é você?' || mensagemLower === 'quem voce é?' || mensagemLower === 'fale sobre você') {
      return res.json({ resposta: 'Sou o CodeBuddy.AI 🧑‍💻, um assistente de inteligência artificial criado para ensinar programação para iniciantes de forma simples, clara e amigável. Meu objetivo é tornar o aprendizado de código uma experiência divertida e acessível para todos!' });
  }
  // *** FIM DA ADIÇÃO ***

  try {
    const model = genAI.getGenerativeModel(modelConfig);
    
    // Se tiver histórico, inicia um chat
    if (historico && Array.isArray(historico)) {
      const chat = model.startChat({
        history: historico
      });
      
      const result = await chat.sendMessage(pergunta);
      const resposta = result.response.text();
      return res.json({ resposta });
    }
    
    // Caso contrário, gera conteúdo simples
    const result = await model.generateContent(pergunta);
    const resposta = result.response.text();
    res.json({ resposta });
    
  } catch (err) {
    console.error('Erro na API:', err);
    
    // Tratamento de erros mais específico
    let mensagemErro = 'Erro ao gerar resposta';
    if (err.message.includes('SAFETY')) {
      mensagemErro = 'A pergunta foi bloqueada pelos filtros de segurança';
    } else if (err.message.includes('API_KEY')) {
      mensagemErro = 'Problema com a chave da API';
    }
    
    res.status(500).json({ erro: mensagemErro, detalhes: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});