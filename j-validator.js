/**
 * @dependence 这相对不是一个通用的插件，主要用在本项目，所以引入一些外部依赖：
 * T.js: 提供一些基本工具
 * ConstDefine : 定义一些校验规则正则
 * @author xinxiang
 * @date 2018.01.13
 *
 * @description validate :
 *  基于jQuery做一个满足该项目学区的输入内容校验器
 * 这仅是一个简单校验器，使用该插件时，需要在每一个校验的input上增加自定义属性 validate
 * 比如： <input type="text" validate="phoneNum" class="form-control" v-model="inviterPhoneNum">
 * 校验器会从页面上（body）或者指定范围读取所有标记了validate的input元素（仅支持校验输入内容的元素：input和textarea元素）
 * 然后按顺序校根据input的validate属性指定的校验规则来校验该input的value值，如果校验不通过，会返回错误消息，并立即提示。
 * 可以考虑在option中配置是否给input显示错误样式。
 *
 */

(function ($){
    var logger = T.getLogger("j-validator.js");
    //校验的方式，校验有效，或者校验是否含有非法字符
    var ValidateType = {
        VALID   : "valid", //从字符串是否完整合法层面校验
        INVALID : "invalid" //从是否含有非法字符方面校验
    };
    /**
     * 校验输入内容的范围，仅校验并提示第一个还是校验并提示所有错误。
     * 当为single时，仅校验并提示第一个输入元素的错误，后续的错误不提示，这个是默认的校验方式。
     * 当为all时校验所有标记了需要校验的输入内容，分别针对每一个输入内容提示。每个输入内容需要给一个错误提示的容器
     */
    var Range = {
        SINGLE : "single",
        ALL : "all"
    };
    //标签上显示的该input的错误提示容器属性名字
    var resultAttrName = "validate-result";

    /**
     * @function errorMessage, 这是一个错误消息结构体，这样写是为了统一返回的错误消息格式，以便使用
     * @param message
     * @param type
     */
    function errorMessage(message,type) {
        this.message = message || "输入内容有误，请检查！";
        this.type    = type ||0;
    }


    /**
     * @description validValidate, 校验输入内容是否合法。协助validators验证通用的文本内容，简化validators中各个校验器的书写
     * 为了防止不跟插件名字重复混淆，名字取为validValidate.
     * @param {string} value,   必选参数，需要校验的文本内容
     * @param {string} label,   必选参数，该输入内容的含义，比如是参会公司名字，用户名等
     * @param {ValidateType} type, 必选参数，表示进行正向校验（是否合法）还是反向校验（是否含有非法字符）
     * @param {Object} option,     可选参数，可以包裹更多的检验参数来校验，目前支持传入：
     *  option = {
     *      reg : 校验的正则 ：如果是校验是否含有非法字符，可以不传，有默认值：RegExp.INVALID_NORMAL_TEXT
     *                        如果是校验是否完整合法，必须传，或者必须有validateFn
     *      miniLength : 最少字符数
     *      validateFn : 自定义校验的方法，必须返回 message 字符串
     *  }
     *

     * @return {errorMessage},  返回错误消息对象或者不反回（校验通过就不返回）
     */
    function validValidate (value, label, type, option) {
        var message = "";
        if(!value){
            message = "请输入："+label;
        }else{
            //检查是否有不允许输入的字符
            var validateReg =  null;
            //校验是否含有非法字符的比较通用，给一个默认值
            if(type == ValidateType.INVALID){
                validateReg = ConstDefine.RegExp.INVALID_NORMAL_TEXT;
            }
            if(option){
                if(option.miniLength){
                    if(value.length < option.miniLength){
                        message = label+"的长度必须大于等于 "+option.miniLength+" 个字符。";
                        return new errorMessage(message);
                    }
                }
                if(option.reg){
                    validateReg = option.reg;
                }
            }


            //如果有传入的校验器，用传入的校验器
            if(option.validateFn){
                message = option.validateFn(value, label);
            }else{
                if(!validateReg){
                    logger.warn("validValidate ::  warning! validator undefined!");
                    //没有校验器就放行吧。。。。。。
                    return null;
                }else{
                    if(type == ValidateType.VALID){
                        var rstb = validateReg.test(value);
                        if(!rstb){
                            message = "["+label+"] 格式不合法，请检查并重新输入。";
                        }
                    }else if(type == ValidateType.INVALID){
                        var rsta = validateReg.exec(value);
                        if(rsta){
                            message = "["+label+"] 中有不允许输入的字符 "+rsta[0]+" 。";
                            message += " ，以下字符不允许输入："+validateReg.toString();
                        }
                    }
                }

            }
            logger.debug("validValidate ::  validate end, message = "+message);

        }
        //统一拼装错误对象，准备返回
        if(message){
            return new errorMessage(message);
        }else{
            return null;
        }
    }

    /**
     * @description validators, 支持的验证器的集合，这里是dom上指定的validator属性值集合
     */
    var validators = {
        //下面是一些公共的校验规则
        //手机号码，正向（是否完全匹配）校验
        telephone : function (_value, _label) {
            var label = _label || "手机号码";
            var option = {
                reg:ConstDefine.RegExp.MOBILE,
                miniLength : 7
            }
            return validValidate(_value, label, ValidateType.VALID, option);
        },
        email : function (_value, _label) {
            var label = _label || "邮箱";
            var option = {
                reg:ConstDefine.RegExp.EMAIL,
                miniLength : 7
            }
            return validValidate(_value, label, ValidateType.VALID, option);
        },
        //邮箱或者手机号码
        emailOrTelephone : function (_value, _label) {
            var label = _label || "邮箱或手机号码";
            var option = {
                miniLength : 7,
                validateFn:function (_value, _label) {
                    var message = "";
                    if((!ConstDefine.RegExp.EMAIL.test(_value)) &&(!ConstDefine.RegExp.MOBILE.test(_value))){
                        message = label+"格式不正确，请重新输入";
                    }
                    return message;
                }
            }
            return validValidate(_value, label, ValidateType.VALID, option);
        },
        //创建活动或者合作公司时候填入呃链接部分
        domainPrefix : function (_value, _label) {
            var label = _label || "域名或者URL";
            var option = {
                reg:ConstDefine.RegExp.DOMAIN_PREFIX,
                miniLength : 2
            }
            return validValidate(_value, label, ValidateType.VALID,option);
        },
        //描述，活动的描述等
        describe :  function (_value, _label) {
            var option = {
                miniLength : 20
            }
            return validValidate(_value, _label || "简介或者描述", ValidateType.INVALID, option);
        },
        //时间日期
        day : function (_value, _label) {
            var label = _label || "开始日期或者结束日期";
            var option = {
                miniLength : 8,
                validateFn : function (_value, _label) {
                    if(!_value){
                        return "请选择开始日期和结束日期";
                    }
                }
            }
            return validValidate(_value, label, ValidateType.VALID, option);
        },
        //时间
        dayTime : function (_value, _label) {
            var label = _label || "开始时间或者结束时间";
            var option = {
                miniLength : 8,
                validateFn : function (_value, _label) {
                    if(!_value){
                        return "请选择开始时间和结束时间";
                    }
                }
            }
            return validValidate(_value, label, ValidateType.VALID, option);
        },
        //用户名
        userName:function (_value, _label) {
            var option = {
                miniLength : 2
            }
            return validValidate(_value, _label || "姓名",ValidateType.INVALID, option);
        },
        //联系人
        contact:function (_value, _label) {
            var option = {
                miniLength : 2
            }
            return validValidate(_value, _label || "联系人",ValidateType.INVALID, option);
        },
        salesmanName:function (_value, _label) {
            var option = {
                miniLength : 2
            }
            return validValidate(_value, _label || "销售姓名",ValidateType.INVALID, option);
        },
        salesmanTel:function (_value, _label) {
            var label = _label || "销售电话";
            return this.telephone(_value,label);
        },
        //客户公司名字
        customerCompanyName:function (_value, _label) {
            var option = {
                miniLength : 2
            }
            return validValidate(_value, _label || "公司名字",ValidateType.INVALID, option);
        },
        //客户公司重要程度
        customerImportance:function (_value, _label) {
            var label = _label || "客户重要程度";
            var option = {
                validateFn:function (_value, _label) {
                    var message = "";
                    if(!ConstDefine.RegExp.DIGITAL.test(_value)){
                        message=label+"必须是数字";
                        return message;
                    }
                    //客户重要程度不能大于5
                    var intValue = parseInt(_value);
                    if(intValue>5 || intValue<=0){
                        message=label+"只能输入1~~5之间的数字";
                        return message;
                    }
                    return message;
                }
            }
            return validValidate(_value, label,ValidateType.INVALID, option);
        },
        //职位
        jobTitle:function (_value, _label) {
            var option = {
                miniLength : 2
            }
            return validValidate(_value, _label || "职位",ValidateType.INVALID, option);
        },
        //以下事活动编辑和创建时候的校验
        activityName :  function (_value, _label) {
            var option = {
                miniLength : 5
            }
            return validValidate(_value, _label || "活动名字",ValidateType.INVALID, option);
        },
        activityAddress:  function (_value, _label) {
            var option = {
                miniLength : 4
            }
            return validValidate(_value, _label || "活动地址",ValidateType.INVALID, option);
        },

        //参会公司名字校验规则
        corporateName : function (_value, _label) {
            var option = {
                miniLength : 2
            }
            return validValidate(_value, _label || "参会公司名字",ValidateType.INVALID,option);
        },
        //股票代码
        stockCode : function (_value, _label) {
            var label = _label || "股票代码";
            //规则放宽一点，用域名片段规则吧
            var option = {
                reg:ConstDefine.RegExp.DOMAIN_PREFIX,
                miniLength : 3
            }
            return validValidate(_value, label, ValidateType.VALID,option);
        },
        industry : function (_value, _label) {
            var option = {
                miniLength : 2
            }
            return validValidate(_value, _label || "行业",ValidateType.INVALID,option);
        },
        inviterName : function (_value, _label) {
            var option = {
                miniLength : 2
            }
            return validValidate(_value, _label || "研究员姓名",ValidateType.INVALID,option);
        },
        roomName : function (_value, _label) {
            var option = {
                miniLength : 2
            }
            return validValidate(_value, _label || "房间名",ValidateType.INVALID,option);
        },

        roomAddress : function (_value, _label) {
            var option = {
                miniLength : 4
            }
            return validValidate(_value, _label || "房间地址",ValidateType.INVALID,option);
        },

        roomBaseCount : function (_value, _label) {
            var option = {
                miniLength : 1,
                validateFn:function (_value, _label) {
                    var message = "";
                    if(!ConstDefine.RegExp.DIGITAL.test(_value)){
                        message="房间数量必须是数字";
                        return message;
                    }
                    if(parseInt(_value)>ConstDefine.Room.MAX_COUNT){
                        message="房间数量不能大于"+ConstDefine.Room.MAX_COUNT;
                        return message;
                    }
                    return message;
                }

            }
            return validValidate(_value, _label || "房间数量",ValidateType.INVALID,option);
        },
        roomCapacity : function (_value, _label) {
            var option = {
                miniLength : 1,
                validateFn:function (_value, _label) {
                    var message = "";
                    if(!ConstDefine.RegExp.DIGITAL.test(_value)){
                        message="容纳人数必须是数字";
                        return message;
                    }
                    if(parseInt(_value)>ConstDefine.Room.MAX_CAPACITY){
                        message="容纳人数不能大于"+ConstDefine.Room.MAX_CAPACITY;
                        return message;
                    }
                    return message;
                }

            }
            return validValidate(_value, _label || "容纳人数",ValidateType.INVALID,option);
        },

        corporateAndSpeaker:function (_value, _label) {
            var option = {
                miniLength : 2
            }
            return validValidate(_value, _label || "参会公司或者演讲嘉宾名字",ValidateType.INVALID,option);
        },

        customerWelcome : function (_value, _label) {
            var option = {
                miniLength : 20
            }
            return validValidate(_value, _label || "客户欢迎辞",ValidateType.INVALID,option);
        },

        loginPassword:function (_value, _label) {
            var miniLength = 6;
            var msg="";
            if(_value.length<=0){
                msg="密码不能为空";
                return new errorMessage(msg);
            }else if(_value.length<miniLength){
                msg="密码长度必须大于等于6位";
                return new errorMessage(msg);
            }
            return null;
        },
        //验证码
        captcha:function (_value, _label) {
           return this.domainPrefix(_value, "验证码");
        },
        //嘉宾的单位
        companyName:function (_value, _label) {
            var option = {
                miniLength : 2
            }
            return validValidate(_value, _label || "单位或公司名字",ValidateType.INVALID,option);
        },

        topic:function (_value, _label) {
            var option = {
                miniLength : 5
            }
            return validValidate(_value, _label || "演讲主题",ValidateType.INVALID,option);
        },

        //合作公司名字
        cooperationName:function (_value, _label) {
            var option = {
                miniLength : 2
            }
            return validValidate(_value, _label || "公司名字",ValidateType.INVALID,option);
        },

        ____intNumberRange:function (_value, _label,range) {
            var label = _label || "数量范围";
            var option = {
                validateFn:function (_value, _label) {
                    var message = "";
                    if(!ConstDefine.RegExp.DIGITAL.test(_value)){
                        message=label+"必须是数字";
                        return message;
                    }
                    //不能小于最小值
                    var intValue = parseInt(_value);
                    if(range.mini!=undefined){
                        if(intValue<range.mini){
                            message=label+"不能小于 "+range.mini;
                            return message;
                        }
                    }
                    //不能大于最大值
                    if(range.max!=undefined){
                        if(intValue>range.max){
                            message=label+"不能大于 "+range.max;
                            return message;
                        }
                    }
                    return message;
                }
            }
            return validValidate(_value, label,ValidateType.INVALID, option);
        },

        superAdminRange:function (_value, _label) {
            var label = _label || "超级管理员数量";
            var range={
                max:ConstDefine.CooperationUserLimit.MAX_SUPER_ADMIN_COUNT,
                mini:ConstDefine.CooperationUserLimit.MINI_SUPER_ADMIN_COUNT
            };
            return this.____intNumberRange(_value, label,range);
        },
        adminRange:function (_value, _label) {
            var label = _label || "管理员数量";
            var range={
                max:ConstDefine.CooperationUserLimit.MAX_ADMIN_COUNT,
                mini:ConstDefine.CooperationUserLimit.MINI_ADMIN_COUNT
            };
            return this.____intNumberRange(_value, label,range);
        },
        salesRange:function (_value, _label) {
            var label = _label || "销售人员数量";
            var range={
                max:ConstDefine.CooperationUserLimit.MAX_SALES_COUNT,
                mini:ConstDefine.CooperationUserLimit.MINI_SALES_COUNT
            };
            return this.____intNumberRange(_value, label,range);
        },
        inviterRange:function (_value, _label) {
            var label = _label || "研究员数量";
            var range={
                max:ConstDefine.CooperationUserLimit.MAX_RESEARCHER_COUNT,
                mini:ConstDefine.CooperationUserLimit.MINI_RESEARCHER_COUNT
            };
            return this.____intNumberRange(_value, label,range);
        }

    }

    /**
     * 处理一下id，处理成jQuery需要的
     */
    function fixId(id) {
        if(id.indexOf("#")<0){
            return "#"+id;
        }else{
            return id;
        }
    }

    function execValidate(rule,value,el) {
        logger.debug("execValidate :: enter,  rule = "+rule+", value = "+value);
        //如果验证器已经定义，开始验证
        if(validators[rule]){
            var rst = validators[rule]($.trim(value));
            return rst;
        }else{
            logger.warn("execValidate :: warning, validator ["+rule + "] undefined");
            return null;
        }
    }

    /**
     * @function hideErrorTips, 隐藏错误提示容器。将方法将会被以静态的方式挂载到jQuery插件上，暴露给其他地方用
     * @param {string} _fixId, 错误提示容器id
     */
    function hideErrorTips(_fixId) {
        var tipsId = fixId(_fixId);
        logger.debug("hideErrorTips :: enter, tipsId = "+tipsId);
        $(tipsId).css("visibility","hidden");
        if($(tipsId).find("span")){
            $(tipsId).find("span").html("");
        }else{
            $(tipsId).html("");
        }

    }

    /**
     * @function showErrorTips, 显示错误提示内容。将方法将会被以静态的方式挂载到jQuery插件上，暴露给其他地方用
     * @param  {string} _fixId, 错误提示容器id
     * @param  {string} message, 错误提示消息内容
     * @param  {boolean} needUpdateScroll, 显示错误小时之后，是否需滚动一下页面滚动条，以确保错误内容处于可见位置
     */
    function showErrorTips(_fixId,message, needUpdateScroll) {
        var tipsId = fixId(_fixId);
        logger.debug("showErrorTips :: enter, tipsId = "+tipsId+", message = "+message+", needUpdateScroll = "+needUpdateScroll);
        $(tipsId).css("visibility","visible");
        if($(tipsId).find("span").length>0){
            $(tipsId).find("span").html(message);
        }else{
            $(tipsId).html(message);
        }
        if(needUpdateScroll){
            $('html,body').animate({scrollTop: '0px'}, 500);
        }
    }

    /***************************以上是提供插件校验能力的校验器************************************/
    /***************************对外的jQuery插件开始************************************/
    /**
     * @description validate , 输入内容校验器，将输入内容校验结果显示在指定的容器中或者alert提示，错图提示内容插件自己处理、提示错误内容了（将一些应用逻辑写在里面了）。
     * @param option, 一些配置，可以不传，目前支持的配置有：
     * {
     *     tipsId : "", {string} 选填。错误提示显示的容器id，当所有的表单在一个地方显示错误提示时（range 为 Range.SINGLE时），建议要填入该项，否则以alert方式提示
     *     range : "", {string} 选填。没有该值时，默认为：Range.SINGLE。含义参考Range常量定义
     *     needUpdateScroll : true|false， 选填。
     * }
     * 使用时，需要在校验的input元素中增加校验属性：
        校验范围为 single时，dom上要增加validator属性来指定校验器，如：validator="customerWelcome"。同时，强烈建议此时要提供一个公共的显示错误信息的容器
        校验范围为 all时，dom上要增加validator属性来指定校验器，同时，dom上要增加validate-result属性来指定该调校验内容出错时候的提示容器，如：validate-result="corporateName_tips"
     * @demo1 示例1，在固定的一个位置显示错误提示，所有可能的错误提示都在该位置提示：
     * dom:
         <div class="msg-tips msg-error" id="errorTipsBox">
         <i class="fa fa-times-circle"></i>
         <span></span>
         </div>

        <input type="text" class="form-control" validator="corporateName">
        <input type="text" class="form-control" validator="attendee">
        <textarea name="" id="" cols="100" rows="6" validator="customerWelcome"></textarea>

     script:
        var rst = $("body").validate({tipsId:"errorTipsBox",needUpdateScroll:true});
     *
     * * @demo2 示例2，在每一个输入内容后面显示错误提示：
     * dom:
     <input type="text" class="form-control" validator="inviterName" validate-result="name_tips">
     <label class="col-sm-4 tips-label  error" id="name_tips"></label>

     <input type="text" class="form-control" validator="corporateName" validate-result="corporateName_tips">
     <label class="col-sm-4 tips-label  error" id="corporateName_tips"></label>

     <input type="text" class="form-control" validator="industry" validate-result="industry_tips">
     <label class="col-sm-4 tips-label  error" id="industry_tips"></label>

     script:
     var option = {
                    range :"all",
                    needUpdateScroll : false
                }
     var rst = $("body").validate(option);

     *
     * @return {boolean}, 校验的结果，校验通过，返回true； 校验不通过，返回false。
     */
    $.fn.validate=function (option) {
        var elements = [];//所有要校验格式的元素数组
        var errors   = [];//校验不通过的元素消息集合
        var validateRang =  Range.SINGLE;
        var tipsId = "";
        if(option){
             if(option.range == Range.SINGLE || option.range == Range.ALL){
                 validateRang = option.range;
             }
             if(option.tipsId){
                 tipsId = option.tipsId;
             }
        }
        elements = $(this).find("input[type='text'],input[type='date'], input[type='password'],input[type='datetime-local'],textarea");
        logger.debug("validate ::elements.length = "+elements.length);
        $.each(elements,function (index,el) {
            var rule = $(el).attr("validator");
            if(rule){
                var validateResult = execValidate(rule,$(el).val(),el);
                //给有错误的元素绑定一下输入事件，输入的时候隐藏掉错误提示，增加个标记，只绑定一次
                if(!$(el).attr("bindinput")){
                    $(el).attr("bindinput", true);
                    $(el).on("input",function () {
                        var _fixId = tipsId;
                        if(validateRang ==  Range.ALL){
                            _fixId = $(el).attr(resultAttrName);
                        }
                        hideErrorTips(_fixId);
                    });
                }


                if(validateResult){
                    validateResult.el = el;
                    errors.push(validateResult);
                    //在本插件中只显示一个错误提示，就显示第一个了，因此，找到一个就跳出循环了，注意，这里得用return false跳出each的循环
                    if(validateRang ==  Range.SINGLE){
                        return false;
                    }
                }
            }
        });
        logger.debug("validate :: errors.length = "+errors.length);
        //如果有错误消息，取第一条提示
        if(errors.length>0){
            //如果验证单条，取第一条提示
            if(validateRang ==  Range.SINGLE){
                var error = errors[0];
                if(tipsId){
                    var containerId = fixId(tipsId);
                    //再检查一次传入的容器是否存在
                    if($(containerId).parent().html()){
                        //用站位的方式来写，省得视觉跳跃
                        showErrorTips(containerId, error.message, option.needUpdateScroll);
                    }else{
                        alert(error.message);
                    }

                }else{
                    alert(error.message);
                }

            }else if(validateRang ==  Range.ALL){
                //如果是验证所有类型，输出没一个错误
                errors.forEach(function (error) {
                    if(error.el){
                        var tipTargetId = $(error.el).attr(resultAttrName);
                        showErrorTips(tipTargetId, error.message, option.needUpdateScroll);
                    }
                });
            }
            //验证完成之后，清空临时持有的数据
            errors = [];
            elements = [];
            return false;
        }else{
            //验证完成之后，清空临时持有的数据
            errors = [];
            elements = [];
            return true;
        }
    }
    //一并将显示和隐藏错误提示也挂载到插件吧，注意，以静态的方式挂载
    $.extend({
        hideErrorTips:hideErrorTips,
        showErrorTips:showErrorTips
    });

})(jQuery);