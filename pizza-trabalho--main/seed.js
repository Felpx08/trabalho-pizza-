require('dotenv').config();
const { ready, run, query } = require('./src/database/sqlite');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    await ready;
    console.log('🧹 Limpando banco...');

    run('DELETE FROM itens_pedido');
    run('DELETE FROM pedidos');
    run('DELETE FROM pizzas');
    run('DELETE FROM clientes');
    run('DELETE FROM usuarios');

    try {
      run("DELETE FROM sqlite_sequence WHERE name IN ('itens_pedido','pedidos','pizzas','clientes','usuarios')");
    } catch(_) { }

    console.log('✅ Banco limpo');

    const hash = await bcrypt.hash('123456', 10);

    run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      ['Administrador Master', 'admin@pizzaria.com', hash, 'Administrador']);
    run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      ['Atendente Oficial', 'atendente@pizzaria.com', hash, 'Atendente']);
    run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      ['Garcom Oficial', 'garcom@pizzaria.com', hash, 'Garcom']);

    console.log('✅ 3 usuários criados');

    const clientes = [
      ['Lucas Ferreira Santos',   '11991234501', {rua:'Rua das Acácias',numero:'142',bairro:'Vila Madalena',cidade:'São Paulo',cep:'05435-000'}, 'Alérgico a glúten'],
      ['Camila Rodrigues Lima',   '11991234502', {rua:'Av. Paulista',numero:'900',bairro:'Bela Vista',cidade:'São Paulo',cep:'01310-100'}, ''],
      ['Rafael Oliveira Costa',   '11991234503', {rua:'Rua Oscar Freire',numero:'55',bairro:'Jardins',cidade:'São Paulo',cep:'01426-001'}, 'Prefere entrega após 19h'],
      ['Isabela Martins Souza',   '11991234504', {rua:'Rua Consolação',numero:'310',bairro:'Consolação',cidade:'São Paulo',cep:'01302-000'}, ''],
      ['Bruno Almeida Pereira',   '11991234505', {rua:'Rua Augusta',numero:'780',bairro:'Cerqueira César',cidade:'São Paulo',cep:'01304-001'}, 'Intolerante a lactose'],
      ['Juliana Nascimento Dias', '11991234506', {rua:'Rua Haddock Lobo',numero:'220',bairro:'Jardim América',cidade:'São Paulo',cep:'01414-000'}, ''],
      ['Thiago Carvalho Mendes',  '11991234507', {rua:'Alameda Santos',numero:'415',bairro:'Cerqueira César',cidade:'São Paulo',cep:'01419-000'}, 'Cliente VIP'],
      ['Fernanda Gomes Ribeiro',  '11991234508', {rua:'Rua Fradique Coutinho',numero:'88',bairro:'Pinheiros',cidade:'São Paulo',cep:'05416-010'}, ''],
      ['Diego Barbosa Freitas',   '11991234509', {rua:'Rua Wisard',numero:'305',bairro:'Vila Madalena',cidade:'São Paulo',cep:'05434-080'}, 'Sem cebola nos pedidos'],
      ['Larissa Teixeira Moura',  '11991234510', {rua:'Rua Amauri',numero:'60',bairro:'Itaim Bibi',cidade:'São Paulo',cep:'01448-000'}, ''],
      ['Matheus Cardoso Nunes',   '11991234511', {rua:'Rua Pamplona',numero:'1200',bairro:'Jardim Paulista',cidade:'São Paulo',cep:'01405-002'}, ''],
      ['Patrícia Rocha Vieira',   '11991234512', {rua:'Av. Brigadeiro Faria Lima',numero:'2000',bairro:'Pinheiros',cidade:'São Paulo',cep:'01452-000'}, 'Prefere pagamento em dinheiro'],
      ['Anderson Silva Campos',   '11991234513', {rua:'Rua Estados Unidos',numero:'175',bairro:'Jardim América',cidade:'São Paulo',cep:'01427-000'}, ''],
      ['Natália Araújo Castro',   '11991234514', {rua:'Rua José Maria Lisboa',numero:'530',bairro:'Jardim Paulista',cidade:'São Paulo',cep:'01423-000'}, 'Vegetariana'],
      ['Felipe Cunha Rezende',    '11991234515', {rua:'Rua Ministro Rocha Azevedo',numero:'72',bairro:'Cerqueira César',cidade:'São Paulo',cep:'01410-001'}, ''],
      ['Vanessa Lopes Guimarães', '11991234516', {rua:'Rua Bela Cintra',numero:'450',bairro:'Consolação',cidade:'São Paulo',cep:'01415-000'}, 'Sem pimenta'],
      ['Gustavo Pires Andrade',   '11991234517', {rua:'Rua da Consolação',numero:'1800',bairro:'Higienópolis',cidade:'São Paulo',cep:'01301-100'}, ''],
      ['Aline Moreira Fonseca',   '11991234518', {rua:'Av. Higienópolis',numero:'618',bairro:'Higienópolis',cidade:'São Paulo',cep:'01238-001'}, 'Cliente frequente'],
      ['Rodrigo Tavares Monteiro','11991234519', {rua:'Rua Itapeva',numero:'286',bairro:'Bela Vista',cidade:'São Paulo',cep:'01332-000'}, ''],
      ['Carolina Batista Pinto',  '11991234520', {rua:'Rua Peixoto Gomide',numero:'1100',bairro:'Jardim Paulista',cidade:'São Paulo',cep:'01409-001'}, 'Prefere bordas recheadas'],
    ];

    for (const [nome, tel, end, obs] of clientes) {
      run('INSERT INTO clientes (nome, telefone, endereco, observacoes) VALUES (?, ?, ?, ?)',
        [nome, tel, JSON.stringify(end), obs]);
    }
    console.log('✅ 20 clientes criados');

    const pizzas = [
      ['Calabresa','Clássica brasileira, presença garantida em qualquer mesa','Calabresa fatiada, cebola e azeitona',{P:35,M:45,G:55},'tradicional'],
      ['Margherita','A tradição italiana em cada fatia','Molho de tomate, mussarela e manjericão fresco',{P:34,M:44,G:54},'tradicional'],
      ['Portuguesa','Farta e completa, agrada a todos','Presunto, ovo, cebola, azeitona e pimentão',{P:38,M:48,G:58},'tradicional'],
      ['Napolitana','Simples, leve e deliciosa','Tomate, mussarela, alho e orégano',{P:33,M:43,G:53},'tradicional'],
      ['Muçarela','A base de tudo, perfeita em sua simplicidade','Molho de tomate e mussarela',{P:30,M:40,G:50},'tradicional'],
      ['Frango com Catupiry','Uma das mais pedidas da casa','Frango desfiado temperado e catupiry original',{P:38,M:48,G:58},'especial'],
      ['Baiana','Para quem gosta de um toque picante','Calabresa moída, cebola e pimenta dedo-de-moça',{P:37,M:47,G:57},'especial'],
      ['Atum','Sabor marcante e diferenciado','Atum em lascas, cebola roxa e azeitona preta',{P:40,M:50,G:60},'especial'],
      ['Vegetariana','Colorida, saudável e cheia de sabor','Abobrinha, cenoura, brócolis, pimentão e tomate cereja',{P:36,M:46,G:56},'especial'],
      ['Pepperoni','Estilo americano com muito pepperoni crocante','Pepperoni fatiado, mussarela e orégano',{P:41,M:51,G:61},'especial'],
      ['Frango com Bacon','Combinação irresistível de sabores defumados','Frango desfiado, bacon crocante, catupiry e milho',{P:42,M:52,G:62},'especial'],
      ['Camarão','Sabor do mar com toque especial da casa','Camarão ao alho e óleo, catupiry e salsa',{P:52,M:65,G:78},'especial'],
      ['Quatro Queijos','Para os verdadeiros apaixonados por queijo','Mussarela, provolone, gorgonzola e parmesão',{P:44,M:56,G:68},'premium'],
      ['Salmão com Cream Cheese','Sofisticada e surpreendente','Salmão defumado, cream cheese, alcaparras e endro',{P:58,M:72,G:86},'premium'],
      ['Trufada com Cogumelos','Alta gastronomia em formato de pizza','Funghi porcini, cogumelo Paris, azeite trufado e parmesão',{P:62,M:78,G:94},'premium'],
      ['Filet Mignon com Gorgonzola','Requinte e sabor em cada pedaço','Medalhão de filé mignon, gorgonzola, rúcula e redução de vinho tinto',{P:68,M:85,G:102},'premium'],
      ['Burrata com Prosciutto','A escolha dos que apreciam o fino','Burrata fresca, prosciutto di Parma, rúcula e mel de trufa',{P:65,M:82,G:98},'premium'],
      ['Camarão VIP','Nossa pizza mais requintada de frutos do mar','Camarão GG flambado, cream cheese, aspargos e ovas de peixe',{P:72,M:90,G:108},'premium'],
      ['Chocolate com Morango','A sobremesa perfeita para encerrar a refeição','Chocolate ao leite, morango fresco e granulado',{P:42,M:52,G:62},'doce'],
      ['Nutella com Banana','Irresistível combinação que conquista de primeira','Nutella, banana caramelada, leite condensado e canela',{P:46,M:58,G:70},'doce'],
    ];

    for (const [nome, desc, ing, precos, cat] of pizzas) {
      run('INSERT INTO pizzas (nome, descricao, ingredientes, precos, categoria) VALUES (?, ?, ?, ?, ?)',
        [nome, desc, ing, JSON.stringify(precos), cat]);
    }
    console.log('✅ 20 pizzas criadas');

    console.log('======================================');
    console.log('🔥 SEED EXECUTADO COM SUCESSO!');
    console.log('======================================');
    console.log('Login: admin@pizzaria.com | Senha: 123456');
    console.log('======================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO NO SEED:', err);
    process.exit(1);
  }
}

seed();
