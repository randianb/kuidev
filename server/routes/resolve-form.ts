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
    },
    'base-card': {
      title: '基础卡片标题',
      content: '这是基础卡片的默认内容，您可以编辑这些信息。',
      status: 'active'
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
  },
  
  // 表单组件数据 - 以组件 code 作为 key
  formComponents: {
    // baseCard 卡片内的表单组件数据
    'input-title': {
      value: '用户填写的标题',
      placeholder: '请输入标题',
      required: true
    },
    'textarea-content': {
      value: '用户填写的内容描述',
      placeholder: '请输入内容',
      rows: 4
    },
    'select-status': {
      value: 'published',
      options: ['draft', 'published', 'archived'],
      label: '状态'
    },
    'checkbox-featured': {
      value: true,
      label: '是否推荐'
    },
    'date-created': {
      value: '2024-01-15',
      label: '创建日期'
    },
    // 其他卡片的表单组件
    'user-name': {
      value: '张三',
      placeholder: '请输入姓名'
    },
    'user-email': {
      value: 'zhangsan@example.com',
      placeholder: '请输入邮箱'
    },
    'user-phone': {
      value: '13800138000',
      placeholder: '请输入手机号'
    }
  }
};

/**
 * 基于 code 的数据映射
 * 将 code 映射到对应的 ID 和类型
 */
const codeToDataMapping: Record<string, { id: string; type: 'card' | 'page' | 'container' }> = {
  // 卡片编码映射
  'user-info': { id: 'card-001', type: 'card' },
  'content-card': { id: 'card-002', type: 'card' },
  'profile-card': { id: 'user-profile', type: 'card' },
  'baseCard': { id: 'base-card', type: 'card' },
  
  // 页面编码映射
  'basic-page': { id: 'page-001', type: 'page' },
  'contact': { id: 'contact-form', type: 'page' },
  'signup': { id: 'registration', type: 'page' },
  
  // 容器编码映射
  'form-container': { id: 'container-001', type: 'container' },
  'survey': { id: 'survey-container', type: 'container' }
};

/**
 * 处理表单数据解析请求
 * 支持通过ID或编码获取表单数据结构
 * GET: 返回模板数据
 * POST: 接收并返回实际表单数据
 */
export function handleResolveForm(req: Request, res: Response) {
  try {
    // POST 请求：处理实际表单数据
    if (req.method === 'POST') {
      const { id, code, type = 'form', formData } = req.body;
      
      if (!formData) {
        return res.status(400).json({
          error: '缺少表单数据',
          message: '请在请求体中提供 formData'
        });
      }
      
      // 返回接收到的表单数据
      return res.json({
        success: true,
        id: id || code,
        code: code || null,
        type: type,
        data: formData,
        timestamp: new Date().toISOString(),
        source: 'actual_form_data'
      });
    }
    
    // GET 请求：返回模板数据（原有逻辑）
    const { id, code, type = 'form', getFormData } = req.query;
    
    // 验证参数
    if (!id && !code) {
      return res.status(400).json({
        error: '缺少必要参数',
        message: '请提供 id 或 code 参数'
      });
    }
    
    let identifier = (id || code) as string;
    let actualType = type as string;
    let formData = null;
    
    // 如果提供的是 code，先从映射中查找对应的 id 和 type
    if (code && !id) {
      const mapping = codeToDataMapping[code as string];
      if (mapping) {
        identifier = mapping.id;
        actualType = mapping.type;
        console.log(`根据编码 ${code} 找到映射: ID=${identifier}, Type=${actualType}`);
      } else {
        console.log(`未找到编码 ${code} 的映射，将直接使用编码作为标识符`);
      }
    }
    
    // 如果请求表单组件数据
    if (getFormData === 'true') {
      // 对于 GET 请求，返回空的表单数据结构，让前端填充实际数据
      formData = {};
      actualType = 'formComponents';
      console.log(`返回空的表单组件数据结构，等待前端填充实际数据`);
    } else {
      // 根据类型查找数据
      switch (actualType) {
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
    }
    
    // 如果没找到数据，返回空对象
    if (!formData) {
      console.log(`未找到 ${actualType} 类型的数据: ${identifier}，返回空数据结构`);
      formData = {};
    }
    
    // 返回表单数据
    res.json({
      success: true,
      id: identifier,
      code: code || null,
      type: actualType,
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