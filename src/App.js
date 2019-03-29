import React, { Component } from 'react';
import './App.css';

const transactionPerPage = 20;

//general structure of app (header + address related stuff)
class App extends Component {
  render() {
    return (
      
      <div className="App" >
        {/* header */}
        <BlockchainAddress/> 
      </div>
    );
  }
}

//container for functionality regarding address search and display of information (including transactions)
class BlockchainAddress extends Component{
  constructor(props) {
    super(props);
    this.state = {
      addressSearchInput: '', //value of the address searchbox
      addressInformation: undefined,
      isLoading: false,
      offset: 0,
      isAddressFound: true,

    };
  }

  //periodically checks for new transactions in the current address
  checkUpdates(){
    if(this.addressInformation === undefined){return}
    const address=this.addressInformation.address
    window.setInterval(() =>{
      //check every second for new transactions
      fetch(`https://blockchain.info/rawaddr/${address}?cors=true&limit=1`)
    .then(response => {
      if (response.status !== 200) {
        console.error('Problem fetching resource from API. Status code: ' + response.status);
        return;
      }
      return response.json();
      })
    .catch(error => {
      console.error(error)
    })
    .then(data => {
      //check if address has new transactions

      if (data !== undefined && this.state.addressInformation.n_tx !== data.n_tx){
        this.searchAddress(address)
      }
    })
    }, 1000);
    

  }
  //updatess address whose information is being displayed (queries server and sets state variables)
  searchAddress = (address) => {
    clearInterval()

    this.setState({
      addressSearchInput:address,
      addressInformation:undefined,
      isLoading:true,
    })

    //fetch Blockchain API to retrieve address information
    fetch(`https://blockchain.info/rawaddr/${address}?cors=true&limit=${transactionPerPage}&offset=${this.state.offset} `)
    .then(response => {
      if (response.status !== 200) {
        console.error('Problem fetching resource from API. Status code: ' + response.status);
        return;
      }
      return response.json();
      })
    .catch(error => {
      this.setState({isLoading:false});
      console.error(error)
    })
    .then(data => {
      if (data !== undefined){
        this.setState({
          addressInformation: data,
          isLoading:false,
          numberOfPages: Math.ceil(data.n_tx/transactionPerPage),
          isAddressFound:true
        },this.checkUpdates) //start periodic updates for this address on the background
      }else{
          this.setState({
            isLoading:false,
            isAddressFound:false
          })
        }
    })

  }

    //triggered when user submits from the address search box
    submitAddressHandle = (e) => {
      e.preventDefault()
      this.searchAddress(this.state.addressSearchInput)
    }
  
    changeOffset = (offset) => {
      this.setState({offset: offset}, () => {
        // query api for new inputs
        this.searchAddress(this.state.addressSearchInput)

      })
    }
  //triggerd when user inputs text in the address search box
  changeAddressInputHandle = (e) => {
    e.preventDefault()
    this.setState({
      addressSearchInput: e.target.value
    })
  }
  render(){
    let content = null;
    
    //load spinner if address is loading
    if(!this.state.isLoading){
      if(this.state.isAddressFound){
        content = <div className = "content"><AddressInformation addressInformation = {this.state.addressInformation} updateAddress = {this.searchAddress}/>
        <TransactionsList addressInformation = {this.state.addressInformation} updateAddress = {this.searchAddress} 
        numberOfPages = {this.state.numberOfPages} offset = {this.state.offset} changeOffset={this.changeOffset}/>  </div>;
      }else{
        //address not found
        content=<h4><span className="badge badge-danger">Address not found</span></h4>
      }
      
    }else{ //load address information
      content = <div className="spinner-border content " role="status">
                    <span className="sr-only ">Loading...</span>
                 </div>
    }

    return (
      <div>
      <InputAddress submitHandle = {this.submitAddressHandle} changeHandle = {this.changeAddressInputHandle} input = {this.state.addressSearchInput}/>
      {content}
      </div>
    )
  }
}


//search box and misc involved in the user searching a new address
class InputAddress extends Component{ 
  render(){
    return (
      <div id = "searchForm">
        <form onSubmit={this.props.submitHandle}>
          <input id = "addressSearchbox" className="form-control" placeholder= "Enter address" value = {this.props.input} onChange={this.props.changeHandle}/>
          <input id = "addressSubmit" className= "btn btn-outline-light" type="submit" value="Search" /> 
        </form>
      </div>
    )
  }
}

//display information about an address
class AddressInformation extends Component{ 
  render(){
    if(this.props.addressInformation === undefined){
      return null
    }
    return(
      <div id = "addressInformation" className = "border border-dark rounded">
        <table className="table-striped table-sm">
          <thead>
            <tr>
              <th>Address information</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Address</td>
              <td className= "btn btn-link btn-sm" onClick = {(e) => {this.props.updateAddress(this.props.addressInformation.address)}}> {this.props.addressInformation.address}</td>
            </tr>
            <tr>
              <td>Hash 160</td>
              <td>{this.props.addressInformation.hash160}</td>
            </tr>
            <tr>
              <td>Final balance</td>
              <td>{this.props.addressInformation.final_balance /1000000000 + " BTC"}</td>
            </tr>
            <tr>
              <td>Number of Transactions</td>
              <td>{this.props.addressInformation.n_tx}</td>
            </tr>
            <tr>
              <td>Amount Received</td>
              <td className="text-success">{this.props.addressInformation.total_received /1000000000 + " BTC"}</td>
            </tr>
            <tr>
              <td>Amount Sent</td>
              <td className = "text-danger"> {this.props.addressInformation.total_sent /1000000000 + " BTC"}</td>
            </tr>
          </tbody>
      </table>
    </div>
    )
  }
}

//display information about an individual transaction 
class IndividualTransaction extends Component{
  constructor(props){
    super(props)

    this.state={
      amount: "0 BTC", //amount sent(<0) or received(>=0)
      toggle: "Show more",
      inputs: null,
      out: null,
      amountColor: "badge badge-success"
    }
  }
  componentDidMount = () => {
    this.setState({
      inputs : this.inputs(),
      out : this.out()
    })
  }
  
  //change show more button text from show more to show less
  toggle(){
    if(this.state.toggle==="Show more"){
      this.setState({toggle:"Show less"})
    }else{
      this.setState({toggle:"Show more"})

    }
  }
  //creates html elements for inputs for a given transaction
  //also sets amount if address found in inputs
  inputs(){
    return this.props.transaction.inputs.map(input => {
      const hash = input.prev_out.addr
      const value = input.prev_out.value

      //sets value of transaction
      if(hash === this.props.originalAddress){
        //technically called when component mounts so state can be updated setting the this.state variable
        // eslint-disable-next-line
        this.state.amount=value * -1 /1000000000 + " BTC"
        // eslint-disable-next-line
        this.state.amountColor = "badge badge-danger"

      }

      //create html element for individual input element
      //the addresses are clickable and they replace the main address being displayed by the new clicked one
      return (
        <div className = "individual-input" key = {Math.random()}>
          <button className= "btn btn-link btn-sm" onClick = {(e) => {this.props.updateAddress(hash)}}> {hash} </button>
          <div className =" badge badge-pill badge-info addressValue"> {value / 1000000000 + " BTC"} </div>
        </div>
      )
    })
  }

  //creates html elements for outs for a given transaction
  //also inits amount if address found in out
  out(){
    return this.props.transaction.out.map(out => {

      //sets value of transaction
      if(out.addr === this.props.originalAddress){
        //technically called when component mounts so state can be updated setting the this.state variable
        // eslint-disable-next-line
        this.state.amount= out.value/1000000000 + " BTC"
        // eslint-disable-next-line
        this.state.amountColor = "badge badge-success"

      }

      //create html element for individual out element
      //the addresses are clickable and they replace the main address being displayed by the new clicked one
      return (
        <div className = "individual-out" key = {Math.random()}>
          <button className= "btn btn-link btn-sm" onClick = {(e) => {this.props.updateAddress(out.addr)}}> {out.addr } </button>
          <div className ="badge badge-pill badge-info addressValue"> {out.value / 1000000000 + " BTC"} </div>
        </div>
      )
    })
  }

  render(){
    const transaction =  this.props.transaction
    const timeStamp = new Date(transaction.time*1000)
    const timeString = `${timeStamp.toLocaleDateString()} - ${timeStamp.toLocaleTimeString()}`

    return(
      <React.Fragment>
      <tr id = {`heading${transaction.hash}`} className= "transaction rounded ">
        <td><div className = "transactionTimeStamp">{timeString}</div></td>
        <td><div className = "transactionHash">{transaction.hash}</div></td>
        <td><div className = {`amount ${this.state.amountColor}`}>{this.state.amount}</div></td>
        <td><button className="btn btn-outline-dark" type="button" data-toggle="collapse" data-target={`#collapse${transaction.hash}`} 
                  aria-expanded="false" aria-controls={`collapse${transaction.hash}` } onClick = {this.toggle.bind(this)} >{this.state.toggle}</button></td>
        </tr>
        <tr>
        <td colSpan="4">     
          <div  className = "collapse " id={`collapse${transaction.hash}`} aria-labelledby={`heading${transaction.hash}`} data-parent="#transactionsList">
            <table className = "table-borderless">
              <thead>
                  <tr className = "white">
                    <th >From</th>
                    <th ></th>
                    <th >To</th>
                  </tr>
              </thead>
              <tbody>
                  <tr className = "white">
                    <td>
                      <div className = "inputs"> {this.state.inputs} </div>
                    </td>
                    <td> 
                      <i className="fas fa-arrow-circle-right"></i>
                    </td>
                    <td>
                      <div className = "out"> {this.state.out} </div>
                    </td>
                  </tr>
              </tbody>
            </table>
          </div>
      </td>
    </tr>
    </React.Fragment>
    )
  }
}

//list of the transactions for a given address
class TransactionsList extends Component{

  //create list of transaction html elements
  transactions(){
    if(this.props.addressInformation === undefined){return}
    const transactions = this.props.addressInformation.txs
    const address = this.props.addressInformation.address
    const updateAddress = this.props.updateAddress

    const htmlTransactions = transactions.map(transaction => {

      return (
        <IndividualTransaction key = {Math.random()} transaction = {transaction} 
                                originalAddress = {address} updateAddress = {updateAddress}/>
      )
    })
    return (
      <React.Fragment>
      <table className="table table-striped">
  <thead>
    <tr>
      <th scope="col">Timestamp</th>
      <th scope="col">Transaction Hash</th>
      <th scope="col">Value</th>
      <th scope="col"></th>
    </tr>
  </thead>
  <tbody>
      {htmlTransactions}
      </tbody>
      </table>
      <Pagination numberOfPages = {this.props.numberOfPages} offset = {this.props.offset} changeOffset= {this.props.changeOffset}/>
      </React.Fragment>
    )
  }
  
  render(){
    return(
      
      <div id = "transactionsList" className="accordion ">
        {this.transactions()}
      </div>
    )
  }
}

//pagination element at the bottom of page to navigate between transactions
class Pagination extends Component{
  render(){
    //create page items
    let pageItems = []
    //due to the simple nature of the app only the 20*20 most recent transactions will be shown max 
    const numberOfPages = Math.min(20,this.props.numberOfPages)
    for (let i = 0; i < numberOfPages; i++) {
      pageItems.push(<li key = {i}onClick={(e) => {this.props.changeOffset(i*transactionPerPage)}} 
                        className="page-item"><button  className="page-link text-dark" href="#">{i+1}</button></li>)
    }

    return(
     
          <nav id = "navigation">
            <ul className="pagination">
              <li className="page-item">
                <button  onClick={(e) => {this.props.changeOffset(0)}}className="page-link"  aria-label="Previous">
                  <span className = "text-dark" aria-hidden="true">&laquo;</span>
                </button>
              </li>
              {pageItems}
              <li className="page-item">
                <button onClick={(e) => {this.props.changeOffset((this.props.numberOfPages-1)*transactionPerPage)}} className="page-link" aria-label="Next">
                  <span className = "text-dark" aria-hidden="true">&raquo;</span>
                </button>
              </li>
            </ul>
          </nav>
    )
  }
}

export default App;
