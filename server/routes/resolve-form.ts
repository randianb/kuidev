import { Request, Response } from 'express';

/**
 * 模拟数据库或数据源
 * 在实际项目中，这里应该连接到真实的数据库
 */
const mockFormData = {
  // 容器卡片数据
  cards: {
    'card-001': {
      name: '',
      age: '',
      email: '',
      phone: ''
    },
    'card-002': {
      title: '',
      description: '',
      category: '',
      status: 'draft'
    },
    'user-profile': {
      firstName: '',
      lastName: '',
      bio: '',
      avatar: '',
      preferences: {
        theme: 'light',
        notifications: true
      }
    }
  },
  // 页面数据
  pages: {
    'page-001': {
      pageTitle: '',
      content: '',
      author: '',
      publishDate: '',
      tags: []
    },
    'contact-form': {
      name: '',
      email: '',
      subject: '',
      message: '',
      urgency: 'normal'
    },
    'registration': {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false
    }
  },
  // 容器数据
  containers: {
    'container-001': {
      containerName: '',
      type: 'form',
      fields: {
        field1: '',
        field2: '',
        field3: ''
      }
    },
    'survey-container': {
      surveyTitle: '',
      questions: [],
      respondentInfo: {
        name: '',
        email: ''
      }
    }
  }
};

/**
 * 处理表单数据解析请求
 * 支持通过ID或编码获取表单数据结构
 */
export function handleResolveForm(req: Request, res: Response) {
  try {
    const { id, code, type = 'form' } = req.query;
    
    // 验证参数
    if (!id && !code) {
      return res.status(400).json({
        error: '缺少必要参数',
        message: '请提供 id 或 code 参数'
      });
    }
    
    const identifier = (id || code) as string;
    let formData = null;
    
    // 根据类型查找数据
    switch (type) {
      case 'card':
        formData = mockFormData.cards[identifier];
        break;
      case 'page':
        formData = mockFormData.pages[identifier];
        break;
      case 'container':
        formData = mockFormData.containers[identifier];
        break;
      case 'form':
      default:
        // 在所有类型中查找
        formData = mockFormData.cards[identifier] || 
                  mockFormData.pages[identifier] || 
                  mockFormData.containers[identifier];
        break;
    }
    
    // 如果没找到数据，返回默认的表单结构
    if (!formData) {
      console.log(`未找到 ${type} 类型的数据: ${identifier}，返回默认表单结构`);
      formData = {
        name: '',
        age: '',
        email: '',
        description: ''
      };
    }
    
    // 返回表单数据
    res.json({
      success: true,
      id: identifier,
      type,
      data: formData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('解析表单数据时出错:', error);
    res.status(500).json({
      error: '服务器内部错误',
      message: '无法解析表单数据'
    });
  }
}

/**
 * 添加新的表单数据模板
 * 用于动态扩展表单数据结构
 */
export function addFormTemplate(type: 'card' | 'page' | 'container', id: string, template: any) {
  if (!mockFormData[type + 's']) {
    return false;
  }
  
  mockFormData[type + 's'][id] = template;
  return true;
}

/**
 * 获取所有可用的表单模板
 */
export function getAvailableTemplates() {
  return {
    cards: Object.keys(mockFormData.cards),
    pages: Object.keys(mockFormData.pages),
    containers: Object.keys(mockFormData.containers)
  };
}