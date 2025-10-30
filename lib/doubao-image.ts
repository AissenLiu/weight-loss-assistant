/**
 * 豆包图片生成 API 客户端
 * 用于生成食物相关的图片
 */

interface ImageGenerationRequest {
  prompt: string
  model?: string
  image?: string[]
  response_format?: 'url' | 'b64_json'
  size?: '2K' | '1K' | '512'
  stream?: boolean
  watermark?: boolean
  sequential_image_generation?: 'auto' | 'manual'
  sequential_image_generation_options?: {
    max_images?: number
  }
}

interface ImageGenerationResponse {
  id: string
  object: string
  created: number
  data: Array<{
    url?: string
    b64_json?: string
    revised_prompt?: string
    index: number
  }>
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

class DoubaoImageClient {
  private apiKey: string
  private baseURL: string
  private defaultModel: string

  constructor() {
    this.apiKey = process.env.DOUBAO_API_KEY || ''
    this.baseURL = process.env.DOUBAO_API_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'
    this.defaultModel = 'doubao-seedream-4-0-250828'

    if (!this.apiKey) {
      console.warn('豆包图片生成API key not configured. Please set DOUBAO_API_KEY in your environment variables.')
    }
  }

  /**
   * 生成食物图片
   */
  async generateFoodImage(foodDescription: string): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('豆包图片生成API key not configured')
    }

    try {
      // 构建专门用于食物图片生成的提示词
      const foodPrompt = this.buildFoodPrompt(foodDescription)

      const requestData: ImageGenerationRequest = {
        model: this.defaultModel,
        prompt: foodPrompt,
        response_format: 'url',
        size: '2K',
        stream: false,
        watermark: true,
        sequential_image_generation: 'auto',
        sequential_image_generation_options: {
          max_images: 1 // 生成2张图片，展示不同角度
        }
      }

      console.log('=== 豆包图片生成请求 ===')
      console.log('食物描述:', foodDescription)
      console.log('生成提示词:', foodPrompt)
      console.log('========================')

      const response = await fetch(`${this.baseURL}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('豆包图片生成API错误响应:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        })
        throw new Error(`豆包图片生成API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data: ImageGenerationResponse = await response.json()

      // 提取图片URL
      const imageUrls: string[] = []
      if (data.data && data.data.length > 0) {
        data.data.forEach(item => {
          if (item.url) {
            imageUrls.push(item.url)
          }
        })
      }

      console.log('=== 豆包图片生成结果 ===')
      console.log('生成图片数量:', imageUrls.length)
      console.log('图片URLs:', imageUrls)
      console.log('========================')

      return imageUrls

    } catch (error) {
      console.error('Error generating food image:', error)
      console.error('=== 豆包图片生成错误信息 ===')
      if (error instanceof Error) {
        console.error('错误消息:', error.message)
      }
      console.error('食物描述:', foodDescription)
      console.error('========================')
      throw error
    }
  }

  /**
   * 构建专门用于食物图片生成的提示词
   */
  private buildFoodPrompt(foodDescription: string): string {
    return `Generate a high-quality, appetizing food photograph of: ${foodDescription}

Requirements:
- Make the food look delicious and professionally photographed
- Use warm, appetizing lighting
- Style: Food photography, restaurant menu quality
- Background: Clean, simple, food-related background
- Colors: Natural, realistic food colors
- Composition: Centered, well-lit, appetizing presentation
- No text, watermarks (except the default API watermark), or signatures
- Focus on making the food look tasty and appealing

The image should be suitable for a food blog or restaurant menu and make viewers want to eat this food.`
  }

  /**
   * 检测文本中是否包含食物相关的关键词（中英文）
   */
  detectFoodKeywords(text: string): boolean {
    const foodKeywords = [
      // 主食类 - Chinese staples
      '米饭', 'rice', '面条', 'noodles', '饺子', 'dumplings', '包子', 'steamed buns', '馒头', 'bread',
      '面包', 'bread', '汉堡', 'burger', '披萨', 'pizza', '意面', 'pasta', '炒饭', 'fried rice', '粥', 'congee',
      // 肉类 - Meat
      '鸡', 'chicken', '牛肉', 'beef', '猪肉', 'pork', '羊肉', 'lamb', '鱼', 'fish', '虾', 'shrimp',
      '蟹', 'crab', '海鲜', 'seafood', '肉', 'meat', '烤肉', 'barbecue', '炸鸡', 'fried chicken', '火锅', 'hotpot',
      // 蔬菜类 - Vegetables
      '蔬菜', 'vegetables', '沙拉', 'salad', '菜', 'dish', '青菜', 'greens', '白菜', 'cabbage',
      '菠菜', 'spinach', '西红柿', 'tomato', '黄瓜', 'cucumber', '土豆', 'potato', '萝卜', 'radish',
      // 水果类 - Fruits
      '水果', 'fruit', '苹果', 'apple', '香蕉', 'banana', '橙子', 'orange', '葡萄', 'grape',
      '草莓', 'strawberry', '西瓜', 'watermelon', '柠檬', 'lemon', '芒果', 'mango',
      // 零食甜点类 - Snacks & Desserts
      '蛋糕', 'cake', '饼干', 'cookies', '巧克力', 'chocolate', '冰淇淋', 'ice cream', '奶茶', 'milk tea',
      '咖啡', 'coffee', '甜点', 'dessert', '零食', 'snacks', '薯片', 'chips', '糖果', 'candy',
      // 饮料类 - Beverages
      '果汁', 'juice', '饮料', 'drink', '汽水', 'soda', '茶', 'tea', '牛奶', 'milk', '豆浆', 'soy milk',
      // 调料和烹饪方式 - Cooking methods
      '炒', 'stir-fry', '煮', 'boil', '蒸', 'steam', '烤', 'bake', '炸', 'fry', '煎', 'pan-fry',
      '红烧', 'braise', '麻辣', 'spicy', '酸甜', 'sweet and sour', '咸', 'salty', '香辣', 'fragrant and spicy',
      // 通用词 - General terms
      '吃', 'eat', '想吃', 'want to eat', '食物', 'food', '美食', 'delicious food', '料理', 'cuisine',
      '餐', 'meal', '早餐', 'breakfast', '午餐', 'lunch', '晚餐', 'dinner', '宵夜', 'midnight snack',
      '小吃', 'snack'
    ]

    const lowerText = text.toLowerCase()
    return foodKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
  }

  /**
   * 从用户消息中提取食物描述
   */
  extractFoodDescription(userMessage: string): string {
    // 简单提取，如果包含"想吃"或"吃了"等词，提取后面的内容
    const eatPatterns = [
      /想吃(.+?)(?:[，。！？]|$)/,
      /吃了(.+?)(?:[，。！？]|$)/,
      /吃(.+?)(?:[，。！？]|$)/,
      /(.+?)好吃/,
      /(.+?)想吃/
    ]

    for (const pattern of eatPatterns) {
      const match = userMessage.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    // 如果没有匹配到特定模式，但检测到食物关键词，返回整个消息
    if (this.detectFoodKeywords(userMessage)) {
      return userMessage
    }

    return ''
  }

  /**
   * 获取API状态信息
   */
  getStatus() {
    return {
      configured: !!this.apiKey,
      baseURL: this.baseURL,
      model: this.defaultModel,
      hasKey: this.apiKey.length > 0
    }
  }
}

// 创建单例实例
export const doubaoImageClient = new DoubaoImageClient()

export type { ImageGenerationRequest, ImageGenerationResponse }
export default DoubaoImageClient