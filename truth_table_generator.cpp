#include<iostream>
#include<string>
template<class T>
class stackNode{
    T value;
    stackNode<T>* next;
public:
    stackNode(T value){
        this->value=value;
        this->next=NULL;
    }
    void setNext(stackNode<T>* next){
        this->next=next;
    }
    T getValue(){
        return value;
    }
    stackNode<T>* getNext(){
        return next;
    }
};
template<class T>
class myStack{
    stackNode<T>* head;
public:
    myStack(){
        head=NULL;
    }
    void push(T value){
        stackNode<T>* node=new stackNode<T>(value);
        if(head==NULL)
            head=node;
        else{
            node->setNext(head);
            head=node;
        }
    }
    T pop(){
        stackNode<T>* node;
        node=head;
        head=head->getNext();
        T value=NULL;
        if(node){
            value=node->getValue();
            delete node;
        }
        return value;
    }
    bool isempty(){
        if(head==NULL)
            return true;
        return false;
    }
    T top(){
        if(head!=NULL)
            return head->getValue();
        return NULL;
    }
};
class signNode{
    char sign;
    bool inv;
    signNode* left;
    signNode* right;
public:
    signNode(char sign, signNode* left=NULL, signNode* right=NULL){
        this->sign=sign;
        this->inv=false;
        this->left=left;
        this->right=right;
    }
    void setinv(){
        inv=!inv;
    }
    bool getinv(){
        return inv;
    }
    signNode* getleft(){
        return left;
    }
    signNode* getright(){
        return right;
    }
    char getsign(){
        return sign;
    }
};
void deletebst(signNode* node){
    if(node==NULL)return;
    if(node->getleft()!=NULL)deletebst(node->getleft());
    if(node->getright()!=NULL)deletebst(node->getright());
    if(node->getleft()!=NULL)delete node->getleft();
    if(node->getright()!=NULL)delete node->getright();
}
bool solve(signNode* node, bool alpha[]){
    bool temp;
    if(node->getsign()=='+')
        temp=solve(node->getleft(),alpha)+solve(node->getright(),alpha);
    else if(node->getsign()=='*')
        temp=solve(node->getleft(),alpha)*solve(node->getright(),alpha);
    else if(node->getsign()=='^')
        temp=solve(node->getleft(),alpha)^solve(node->getright(),alpha);
    else
        temp=alpha[node->getsign()];
    if(node->getinv())temp=!temp;
    return temp;
}
void my_truth_table_generator(std::string s){
    s='('+s+')';
    bool alpha[128];
    for(int i=0;i<128;i++)alpha[i]=false;
    int beta[128]={0};
    int tokens=0;
    int priority[128]={0};
    priority['+']=1;
    priority['*']=2;
    priority['^']=2;
    myStack<char> cstk;
    myStack<signNode*> nstk;
    signNode* tree=NULL;
    for(char c:s){
        if(c=='(')
            cstk.push(c);
        else if((c>='a'&&c<='z')||(c>='A'&&c<='Z')){
            if(!alpha[c]){
                beta[tokens++]=c;
                alpha[c]=true;
            }
            signNode* temp= new signNode(c);
            nstk.push(temp);
        }
        else if(priority[c]>0){
            while(!cstk.isempty()&&cstk.top()!='('&&priority[cstk.top()]>priority[c]){
                tree= new signNode(cstk.pop(),nstk.pop(),nstk.pop());
                nstk.push(tree);
            }
            cstk.push(c);
        }
        else if(c==')'){
            while(!cstk.isempty()&&cstk.top()!='('){
                tree=new signNode(cstk.pop(),nstk.pop(),nstk.pop());
                nstk.push(tree);
            }
            cstk.pop();
        }
        else if(c=='\'')
            (nstk.top())->setinv();
    }
    tree=nstk.pop();
    std::string temp="";
    for(char c:s)
        if(c!='\'')
            temp+=c;
    s=temp;
    for(int i=0;i<128;i++)alpha[i]=false;
    bool loopend=false;
    while(!loopend){
        for(int i=0;i<tokens;i++)std::cout<<alpha[beta[i]]<<" ";
        std::cout<<solve(tree,alpha)<<std::endl;
        loopend=true;
        for(int i=0;i<tokens;i++)
            loopend=loopend*alpha[beta[i]];
        for(int i=tokens-1;i>=0;i--){
            alpha[beta[i]]=!alpha[beta[i]];
            if(alpha[beta[i]]==true)
                break;
        }
    }
    deletebst(tree);
    delete tree;
}
int main(){

    std::string s;
    std::cin>>s;
    my_truth_table_generator(s);
    std::getchar();
    return 0;
}
