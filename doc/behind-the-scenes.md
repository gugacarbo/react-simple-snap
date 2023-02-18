# Debaixo dos Panos...

1. Copia o arquivo index.html como 200.html
2. Inicia um servidor web local com a sua aplicação (por 3. padrão, usa /build como raiz)
3. Visita / ou quaisquer outras páginas listadas na 1.configuração include
4. Encontra todos os links na página com o mesmo domínio e os adiciona à fila
5. Se houver mais de uma página na fila, ele também adiciona /404.html à fila
6. Renderiza a página com a ajuda do puppeteer
7. Aguarda até que não haja mais solicitações de rede ativas por mais de 0,5 segundos
8. Remove os pacotes do webpack, se necessário
9. Remove os estilos com URLs de blob, se necessário
10. Recria o texto para tags de estilo para soluções CSS-in-JS, se necessário
11. Inclui o CSS crítico, se configurado
12. Coleta recursos para o manifesto de push http2, se configurado
13. Minifica o HTML e o salva no disco
    Se route termina com .html, ele será usado como está, caso contrário, route/index.html será usado

# Outras características

`react-simple-snap` trabalha em paralelo, por padrão, ele usa 4 guias no navegador. Pode ser configurado com a opção `concurrency`.
