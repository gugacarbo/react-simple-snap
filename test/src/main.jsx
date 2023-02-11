import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const RootElement = document.getElementById('root')

if(RootElement.hasChildNodes()){
  ReactDOM.hydrateRoot(RootElement,<App />)
}else{
  ReactDOM.createRoot(RootElement).render(<App />)
}
