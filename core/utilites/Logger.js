'use strict';

class Logger{
    constructor(){
        this.subjects = {};
        this.subjects.TwilioSubject="Twilio";
        this.subjects.ChatSubject="Chat";
        this.subjects.WorkflowSubject="Workflow";
        return this;
    };
    logEvent(subject,message,data,may_include_pers_data){
      if(may_include_pers_data==true){
            this.log('info',subject+":"+message);
      }else{
        if(data!=undefined){
                this.log('info',subject+":"+message,data);
        }else{
                this.log('info',subject+":"+message);
        }
      return false;
      //log
      }
    };
    logError(subject,message,data,may_include_pers_data){
        console.log(data)
      if(typeof message === 'string' && data==undefined){
        this.log('error',subject+":"+message);
        return true;
      }else{

        if(may_include_pers_data===true){
              this.log('error',subject+":"+message);
        }else{
          if(typeof message === 'object'){
            if(message.message){
              var log_data = {data:data}
              if(!message.data){
                message.data = {};
              }                
              if(message.stack){
                console.log(message.stack);
//                log_data.stack = message.stack;
              }
              this.log('error',subject+":"+message.message,log_data);
              return true;
            }
          }
          if(data!==undefined){
            if(typeof data === 'object'){
                if(data.message){
                    data = data.message;
                }else{
                    data = JSON.stringify(data);
                }
                if(data.auth_token){
                    data.auth_token='HIDDEN';
                }
            }
            this.log('error',subject+":"+message,data);
          }else{
            this.log('error',subject+":"+message);
          }
        }        
      }
      return false;
  };
  log(level,message,data){
        //if (process.env.NODE_ENV !== 'production') {
            console.log({
                level: level,
                message: message,
                data:JSON.stringify(data)
            });
        //}
  };
   }

module.exports = Logger;