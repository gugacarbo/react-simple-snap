# react-simple-snap [![Build Status](https://travis-ci.org/stereobooster/react-snap.svg?branch=master)](https://travis-ci.org/stereobooster/react-snap)

**Otimize o SEO e a Performace da sua SPA**

- Pré renderiza seu Web App em uma página HTML estática.
- Usa [Headless Chrome](https://github.com/GoogleChrome/puppeteer) para procurar por links para outras rotas à partir da raiz (Root).
- React 18+
- **Esta é uma versão da biblioteca [react-snap](https://github.com/stereobooster/react-snap) `(fork at V1.23.0)`**

**Pronta para usar**. [veja o que ele faz por debaixo dos panos](doc/behind-the-scenes.md).

## 🤖 Funcionalidades

- Habilita **SEO** (Google, Bing, DuckDuckGo...) e **SMO** (Twitter, Facebook, Instagram) para SPAs.

- Funciona com [create-react-app](https://github.com/facebookincubator/create-react-app) - sem alterações de código necessárias.
- Funciona com [vite](https://vitejs.dev/) - sem alterações de código necessárias.

- Usa um **browser real** ([puppeteer](https://github.com/puppeteer/puppeteer/tree/main)) por de baixo dos panos, eliminando problemas de funcionalidades de HTML5 não suportadas , como WebGL or Blobs.
- Várias **otimizações de desempenho de decarregamento da página**. [Details](doc/load-performance-optimizations.md), `english`.
- **Independente do React**. Funciona com qualquer tecnologia (ex. Vue)
- A biblioteca npm não tem etapa de compilação, então você pode fazer um fork, mudar o que quiser, e instalar com a URL do GitHub do seu repositório.

## 💭 Motivação

Ao publicar meu primeiro site em React em um servidor público, me deparei com vários problemas de SEO, principalmente na indexação correta das páginas pelo Google.

Inspirado [nesse vídeo](https://www.youtube.com/watch?v=V2T_bkOs0xA) do [Filipe Deschamps](https://github.com/filipedeschamps), onde ele fala sobre páginas pré renderizadas com NextJS, procurei uma ferramenta que não precisasse de um servidor _node_ rodando e eu pudesse usar em uma hospedagem compartilhada.

E a solução foi encontrada com a biblioteca **[react-snap](https://github.com/stereobooster/react-snap)**, que tráz muitas opções para configuração e melhoria de desempenho de carregamento da página e SEO.

Mas com a versão 18 do React, o react-snap parou de funcionar, e sua ultima atualização foi há 4 anos.

## 🔥 Como usar

### Instalação

```sh
yarn add --dev react-simple-snap
```

### Adicione o Script

`package.json`

```json
{
  "scripts": {
    "postbuild": "react-simple-snap"
  }
}
```

Altere o arquivo `src/index.js` ou `src/main.jsx` :

```js
import { createRoot, hydrateRoot } from "react-dom/client";
const rootElement = document.getElementById("root");

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, <App />);
} else {
  createRoot(rootElement).render(<App />);
}
```

Execute no terminal
`yarn build`

E o react-simple-snap trabalhará após o `build` no processo de `postbuild` com o diretório padrão `/dist`

## ⚙️ Configurações

⚠️ **Praticamente Todas** as configurações presentes em [react-snap](https://github.com/stereobooster/react-snap) foram mantidas, porém o arquivo de configurações foi alterado de `/package.json` para `.snap.json`

Você pode conferir muito mais funcionalidades e explicações no repositório do **[react-snap](https://github.com/stereobooster/react-snap)**

Veja **[aqui](doc/options.md)** todas as configurações disponíveis.

### Principais

`.snap.json`

```json
{
  //diretório fonte do projeto após build
  "source": "dist",

  // default; Define user agent acessado por navigator.userAgent
  "userAgent": "react-simple-snap",

  // rotas a serem pré-rendereizadas
  "include": ["/"],

  //transforma o css em uma linha para reduzir tamanho do arquivo (pode ocorrer erros)
  "inlineCss": false,

  // procura por links para outras rotas e as renderiza
  "crawl": true
}
```

### Alterações de configurações `react-snap`

```js
{
/*
 * Removida
 * "saveAs": "html" // | "png" | "jpg,
 * // salva a renderização como screenshot
 */
  "screenshot": false, // default | ("png" | true) | "jpeg"
}
```

## ⚠️ Atenção

Para maioria dos apps, a instalação padrão do _react-simple-snap_ ja é suficiente para tudo funcionar bem sem alterar nada no seu código.

Porém dependendo das estratégias e funcionalidades voce escolheu para seu app, alguns problemas podem acontecer.

A correção de vários possíveis problemas encontrados está presente na **[documentação do react-snap](https://github.com/stereobooster/react-snap).**

### 💤 Problemas com coisas dinâmicas

Se as coisas _´se mexerem sozinhas´_ no seu app, como com o uso de animações, requisições, uso de importações dinâmicas como `react.lazy()` ou outras técicas de [_code-splitting_](https://reactjs.org/docs/code-splitting.html), você deve tomar alguns cuidados ao criar seus projetos.

**App Exemplo**
`src/main.jsx`

```jsx
import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import axios from "axios";
import styled from "styled-components"; // Funciona com CSS-IN-JS!
const rootElement = document.getElementById("root");

//Suporta classes feitas por js!
const AppContainer = styled.div`
  color: #09c;
`;

//1 - Incia a tela com o texto "Conteúdo1"
//2 - Altera a string para "Conteúdo2"
//3 - Requisita uma frase aleatória e imprime na tela

const App = () => {
  const [string, setString] = React.useState("Conteúdo1");
  React.useEffect(() => {
    //Altera a string para "Conteúdo"
    useState("Conteúdo2");
    //Requisita uma frase aleatória
    axios
      .get("https://baconipsum.com/api/?type=bacon")
      .then((data) => setString(data.data[0]));
  }, []);

  return <AppContainer>{string}</AppContainer>;
};

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, <App />);
} else {
  createRoot(rootElement).render(<App />);
}
```

`src/index.html`

```html
<html>
  <head>
    <title>Title</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

#### Geração das páginas estáticas

Após o processo de build, o simple-snap acessa as páginas do app com um navegador _headless_ e espera até todos os recursos serem carregados + 0.5 segundos e então gera um código estático html daquela página.

#### hydrateRoot

A função hydrateRoot é uma função de renderização do React que é usada para atualizar o conteúdo do elemento `#root` existente com base em um novo elemento renderizado.
o React renderiza seu app, como faz a função `renderToString()` de `react-dom/server` e compara esse html em texto com o conteúdo do elemento `div#root` do html gerado pelo `simple-snap`.

#### Por que usar hydrateRoot?

Quando o usuário carrega a página de um app sem pré renderização, ele recebe um arquivo html com o conteúdo do body sendo somente uma div vazia

conteúdo do `body` `/index.html` _sem pré renderização_

```html
<div id="root"></div>
```

Mas ao pré renderizar seu app, a div #root já vai estar com o conteúdo correto a ser mostrado para o usuário.

conteúdo do `body` `/index.html` _com pré renderização_

```html
<div id="root">
  <div class="ackr"><!--{...ConteúdoDoApp}--></div>
</div>
```

Assim o conteúdo é entregue ao usuário sem que ele espere o tempo que leva para a primeira renderização.

#### Problema

O problema acontece uma vez que o `hydrateRoot()` não espera os recursos da página carregarem antes de efetuar a comparação. Então se qualquer elemento for adicionado, removido ou tiver alguma propriedade alterada entre o tempo que o simple-snap leva para renderizar a página (networkIdle + 0.5s), um erro será retornado.

**Conteúdo renderizado pelo `hydrateRoot()`**

```html
<div id="root"><div class="ackr">Conteúdo1</div></div>
```

**Conteúdo do arquivo `index.html` gerado pelo simple-snap**

```html
<div id="root"><div class="ackr">Jowl landjaeger andouille belly...</div></div>
```

Note que o conteúdo esperado pelo `hydrateRoot()` é o conteúdo do estado inicial da aplicação, antes do useEffect() ser executado.

O conteúdo arquivo pré renderizado contém uma frase obtida por uma requisição get.

Durante a etapa de desenvolvimento nenhum erro deve acontecer, uma vez que o arquivo html utilizado durante essa etapa no diretório raiz do projeto estará sempre com a `div#id` vazia.

Após o `build` e `postbuild`, você pode usar o comando `yarn preview` para ver como o projeto compilado e pré-renderizado ficou, e nesse momento você pode notar um erro no console.

```js
Uncaught Error: Minified React error #425; visit https://reactjs.org/docs/error-decoder.html?invariant=425
```

O erro descrito na mensagem é:

```js
Text content does not match server-rendered HTML.
```

#### Soluções

Existem diversas soluções que você pode utilizar pra resolver esse tipo de problema.

Várias delas estão na [documentação do react-snap](https://github.com/stereobooster/react-snap).

**Sabendo Que**

`simple-snap` - Espera a página carregar.

`hydrateRoot()` - renderiza instantâneamente a página. _(antes do useEffect)_

**Você pode**

##### Esconder coisas do **`simple-snap`**

Você pode configurar o userAgent no arquivo `.snap.json`

```json
{
  "userAgent": "react-simple=snap" // default
}
```

E verificar se o browser que está acessando o app é o pré renderizador ou não.

```js
const App = () => {
  const [string, setString] = React.useState("Conteúdo1");

  React.useEffect(() => {
    //Se o userAgent NÃO for o pré renderizador
    if (window.userAgent != "react-simple-snap") {
      setString("Conteúdo2");
      axios
        .get("https://baconipsum.com/api/?type=bacon")
        .then((data) => setString(data.data[0]));
    }
  }, []);

  return <AppContainer>{string}</AppContainer>;
};
```

_Resultado do `simple-snap`_

```html
<div id="root"><div class="ackr">Conteúdo1</div></div>
```

Note que o `setState("Conteudo2")` também ficou dentro da condicional, pois se estivesse fora, seria executado na renderização;

##### Esconder coisas do `hydrateRoot()`

Como o `hydrateRoot()` renderiza a página antes do `useEffect()`

```js
const App = () => {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(true), []);

  return <AppContainer>{show && "hydrateRoot Não me vê"}</AppContainer>;
};
```

_Resultado do `hydrateRoot()`_

```html
<div id="root"><div class="ackr"></div></div>
```

### Nada Resolveu?

Se você procurou em todos os lugares que podia e continua dando erro de _hyration_?

**Remova o hydrateRoot()**

Você continua com as otimizaçoões de SEO, só "deixa de ganhar" performace e UX.
