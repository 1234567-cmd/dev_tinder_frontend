import { BrowserRouter, Routes, Route } from 'react-router-dom'

import './index.css'
import { Body } from './Body'
import { Login } from './Login'
import { Profile } from './Profile'
import { Provider } from 'react-redux'
import appStore from './utils/Appstore'

function App() {
  return (
    <div className="App">
      <Provider store={appStore}>
      <BrowserRouter basename="/">
        <Routes>
          <Route path="/" element={<Body />}>
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </Provider>
    </div>
  )
}

export default App
