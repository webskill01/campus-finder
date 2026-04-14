import { createContext, useContext, useReducer, useEffect } from 'react'
import { authMe } from '../api/api'

const initialState = {
  tab: 'found',
  page: 1,
  category: 'all',
  sort: 'recent',
  dateRange: 'all',
  query: '',
  aiMode: false,
  aiFilters: null,
  user: null,
  popup: null,      // null | 'login' | 'post' | 'detail' | 'interest' | 'profile' | 'logout'
  activeItem: null,
  refreshTick: 0,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, tab: action.payload, page: 1 }
    case 'SET_PAGE':
      return { ...state, page: action.payload }
    case 'SET_CATEGORY':
      return { ...state, category: action.payload, page: 1 }
    case 'SET_SORT':
      return { ...state, sort: action.payload }
    case 'SET_DATE_RANGE':
      return { ...state, dateRange: action.payload }
    case 'SET_QUERY':
      return { ...state, query: action.payload.query, aiMode: action.payload.aiMode, aiFilters: action.payload.aiFilters ?? null, page: 1 }
    case 'SET_USER':
      return { ...state, user: action.payload }
    case 'OPEN_POPUP':
      return { ...state, popup: action.payload.popup, activeItem: action.payload.activeItem ?? state.activeItem }
    case 'CLOSE_POPUP':
      return { ...state, popup: null, activeItem: null }
    case 'SET_ACTIVE_ITEM':
      return { ...state, activeItem: action.payload }
    case 'REFRESH_ITEMS':
      return { ...state, refreshTick: state.refreshTick + 1 }
    default:
      return state
  }
}

export const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const token = localStorage.getItem('cf_token')
    if (!token) return
    authMe(token)
      .then(user => dispatch({ type: 'SET_USER', payload: user }))
      .catch(() => localStorage.removeItem('cf_token'))
  }, [])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}

export function useAppState() { return useContext(AppContext).state }
export function useAppDispatch() { return useContext(AppContext).dispatch }
