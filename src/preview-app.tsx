import '../client/global.css';
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import CleanPreview from '../client/pages/CleanPreview'
import { PageMeta } from '../client/studio/types'
import '../client/hooks/use-theme.ts'

// 精简的预览应用入口
function PreviewApp() {
  const [pageData, setPageData] = useState<PageMeta | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 获取页面ID
    const urlParams = new URLSearchParams(window.location.search)
    const pageId = urlParams.get('id')
    
    if (!pageId) {
      setLoading(false)
      return
    }

    // 尝试多种方式获取页面数据
    const loadPageData = async () => {
      try {
        // 1. 尝试从全局变量获取
        if ((window as any).pageData) {
          setPageData((window as any).pageData)
          return
        }

        // 2. 尝试从localStorage获取
        const storedPages = localStorage.getItem('studio.pages')
        if (storedPages) {
          console.log('localStorage.studio.pages:', storedPages)
          const pages = JSON.parse(storedPages)
          const foundPage = pages.find((p: PageMeta) => p.id === pageId)
          if (foundPage) {
            console.log('从localStorage找到页面:', foundPage)
            setPageData(foundPage)
            return
          } else {
            console.log('在localStorage中未找到页面ID:', pageId)
          }
        } else {
          console.log('localStorage中没有找到studio.pages')
        }

        // 3. 尝试从URL参数直接获取页面数据
        const pageDataParam = urlParams.get('data')
        if (pageDataParam) {
          try {
            const decodedData = JSON.parse(atob(pageDataParam))
            setPageData(decodedData)
            return
          } catch (e) {
            console.error('解析页面数据失败:', e)
          }
        }

        // 4. 尝试从服务器获取（如果有API）
        try {
          const response = await fetch(`/api/pages/${pageId}`)
          if (response.ok) {
            const data = await response.json()
            setPageData(data)
            return
          }
        } catch (e) {
          console.log('无法从服务器获取页面数据')
        }

        // 5. 如果以上都失败，尝试从window全局获取预加载的页面数据
        const preloadedPages = (window as any).preloadedPages
        if (preloadedPages && preloadedPages[pageId]) {
          setPageData(preloadedPages[pageId])
          return
        }

      } catch (error) {
        console.error('加载页面数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPageData()
  }, [])

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium mb-2">加载中...</div>
          <div className="text-sm text-gray-500">
            正在获取页面数据
          </div>
        </div>
      </div>
    )
  }

  return (
    <React.StrictMode>
      <CleanPreview pageData={pageData} pageId={pageData?.id} />
    </React.StrictMode>
  )
}

// 渲染应用
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<PreviewApp />)
}